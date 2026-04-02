import sys

# Mock BomChangeSet if it isn't available
try:
    from edms_api.models import BomChangeSet
except ImportError:
    class BomChangeSet:
        objects = None

def get_bom_children(assembly_id: str, version_id) -> list[dict[str, object]]:
    # Get BomChangeSet from current module so tests can patch it
    change_sets = BomChangeSet.objects.filter(
        assembly_id=assembly_id,
        source_version_id=version_id
    ).prefetch_related('operations')

    children: list[dict[str, object]] = []
    for change_set in change_sets:
        # Assuming change_set has an 'operations' manager
        for operation in change_set.operations.all():
            # Flattening logic: assuming operations contain child items
            if hasattr(operation, 'child_item') and operation.child_item:
                children.append(operation.child_item)
    return children
