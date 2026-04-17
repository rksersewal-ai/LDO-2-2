"""
Batch Processor
Handles concurrent batch operations with configurable concurrency limits,
error collection, and progress callbacks.
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Generic, Iterable, List, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")
R = TypeVar("R")


@dataclass
class BatchResult(Generic[T, R]):
    """Result of a batch operation."""
    total: int = 0
    succeeded: int = 0
    failed: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)
    results: List[R] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        return self.succeeded / self.total if self.total > 0 else 0.0

    @property
    def all_succeeded(self) -> bool:
        return self.failed == 0 and self.total > 0


class BatchProcessor:
    """
    Run operations concurrently with a max concurrency limit.

    Example:
        processor = BatchProcessor(max_workers=5)
        result = processor.run(
            items=document_ids,
            operation=lambda doc_id: DocumentService.archive(doc_id),
        )
        print(f"{result.succeeded}/{result.total} succeeded")
    """

    def __init__(self, max_workers: int = 5):
        self.max_workers = max_workers

    def run(
        self,
        items: Iterable[T],
        operation: Callable[[T], R],
        on_progress: Optional[Callable[[int, int], None]] = None,
        stop_on_error: bool = False,
    ) -> BatchResult:
        """
        Execute `operation(item)` for each item concurrently.

        Args:
            items: Iterable of items to process
            operation: Callable that processes one item
            on_progress: Optional callback(completed_count, total_count)
            stop_on_error: If True, cancel remaining tasks on first failure
        """
        items_list = list(items)
        total = len(items_list)
        result: BatchResult = BatchResult(total=total)

        if total == 0:
            return result

        completed = 0
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_item = {
                executor.submit(operation, item): item for item in items_list
            }

            for future in as_completed(future_to_item):
                item = future_to_item[future]
                completed += 1
                try:
                    value = future.result()
                    result.succeeded += 1
                    result.results.append(value)
                except Exception as exc:
                    result.failed += 1
                    result.errors.append({"item": str(item), "error": str(exc)})
                    logger.warning("Batch operation failed for item=%s: %s", item, exc)
                    if stop_on_error:
                        # Cancel remaining futures
                        for f in future_to_item:
                            f.cancel()
                        break

                if on_progress:
                    on_progress(completed, total)

        logger.info(
            "Batch complete: %d/%d succeeded (%.0f%%)",
            result.succeeded, result.total, result.success_rate * 100,
        )
        return result


class AsyncBatchProcessor:
    """Async version for use within Django async views or Celery tasks."""

    def __init__(self, max_concurrency: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrency)

    async def run(
        self,
        items: Iterable[T],
        operation: Callable[[T], Any],
    ) -> BatchResult:
        items_list = list(items)
        result: BatchResult = BatchResult(total=len(items_list))

        async def guarded(item: T):
            async with self.semaphore:
                return await asyncio.get_event_loop().run_in_executor(None, operation, item)

        tasks = [guarded(item) for item in items_list]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for item, response in zip(items_list, responses):
            if isinstance(response, Exception):
                result.failed += 1
                result.errors.append({"item": str(item), "error": str(response)})
            else:
                result.succeeded += 1
                result.results.append(response)

        return result
