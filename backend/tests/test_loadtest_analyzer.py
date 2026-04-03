import csv
import tempfile
from pathlib import Path

from django.test import SimpleTestCase

from loadtests.analyze_results import parse_stage_stats


class LoadtestAnalyzerTests(SimpleTestCase):
    def test_parse_stage_stats_extracts_slowest_and_rates(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / 'stage_1000_stats.csv'
            with path.open('w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=['Name', 'Request Count', 'Failure Count', 'Median Response Time', '95%', '99%'],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        'Name': 'documents/list',
                        'Request Count': '100',
                        'Failure Count': '1',
                        'Median Response Time': '120',
                        '95%': '900',
                        '99%': '1500',
                    }
                )
                writer.writerow(
                    {
                        'Name': 'documents/upload',
                        'Request Count': '50',
                        'Failure Count': '2',
                        'Median Response Time': '400',
                        '95%': '3000',
                        '99%': '5200',
                    }
                )

            summary = parse_stage_stats(str(path))

            self.assertEqual(summary.users, 1000)
            self.assertEqual(summary.total_requests, 150)
            self.assertEqual(summary.total_failures, 3)
            self.assertGreater(summary.error_rate, 0)
            self.assertEqual(summary.slowest_by_p99[0].endpoint, 'documents/upload')
