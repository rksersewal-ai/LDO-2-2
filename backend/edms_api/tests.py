from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from edms_api.models import Approval, Document, PlDocumentLink, PlItem, SupervisorDocumentReview, WorkRecord
from shared.models import DomainEvent
from work.models import WorkRecordExportJob


class ModularApiSmokeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester',
            password='pass12345',
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(self.user)
        self.pl_item = PlItem.objects.create(id='12345678', name='Smoke PL', description='PL for tests')
        self.document = Document.objects.create(
            id='DOC-T-001',
            name='Smoke Document',
            description='Document for tests',
            type='PDF',
            status='Draft',
            file=SimpleUploadedFile('doc.txt', b'hello world'),
        )
        self.approval = Approval.objects.create(
            id='APPROVAL-001',
            entity_type='document',
            entity_id=self.document.id,
            requested_by=self.user,
        )
        self.pl_item.design_supervisor = 'tester'
        self.pl_item.save(update_fields=['design_supervisor'])

    def test_login_endpoint_returns_expected_payload(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': 'tester', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'tester')

    def test_versioned_and_legacy_routes_both_respond(self):
        for path in [
            '/api/v1/pl-items/',
            '/api/pl-items/',
            '/api/v1/pl-items/12345678/',
            '/api/pl-items/12345678/',
            '/api/v1/search/?q=Smoke&scope=ALL',
            '/api/search/?q=Smoke&scope=ALL',
            '/api/v1/audit/log/',
            '/api/audit/log/',
        ]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)

    def test_link_document_publishes_domain_event(self):
        response = self.client.post(
            '/api/v1/pl-items/12345678/documents/link/',
            {'document_id': self.document.id, 'link_role': 'GENERAL'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            DomainEvent.objects.filter(
                event_type='PlLinkedToDocument',
                aggregate_type='PlItem',
                aggregate_id='12345678',
            ).exists()
        )

    def test_create_work_record_and_export_job(self):
        response = self.client.post(
            '/api/v1/work-records/',
            {
                'date': '2026-03-20',
                'closingDate': '2026-03-22',
                'workCategory': 'DRAWING',
                'workType': 'Drawing Amendment',
                'description': 'Updated a drawing package',
                'eOfficeNumber': 'CLW/TEST/2026/0001',
                'plNumber': '12345678',
                'status': 'SUBMITTED',
                'targetDays': 5,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(WorkRecord.objects.count(), 1)
        self.assertTrue(
            DomainEvent.objects.filter(
                event_type='WorkRecordLogged',
                aggregate_type='WorkRecord',
            ).exists()
        )

        export_response = self.client.post(
            '/api/v1/work-records/export-jobs/',
            {'format': 'xlsx', 'filters': {'status': 'OPEN'}},
            format='json',
        )
        self.assertEqual(export_response.status_code, 202)
        self.assertEqual(WorkRecordExportJob.objects.count(), 1)

    def test_approval_action_publishes_domain_event(self):
        response = self.client.post(
            '/api/v1/approvals/APPROVAL-001/approve/',
            {'comment': 'Approved in test'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'Approved')
        self.assertTrue(
            DomainEvent.objects.filter(
                event_type='ApprovalGranted',
                aggregate_type='Approval',
                aggregate_id='APPROVAL-001',
            ).exists()
        )

    def test_supervisor_document_review_created_and_approved(self):
        previous = Document.objects.create(
            id='DOC-T-OLD',
            name='Brake Drawing Pack',
            description='Older revision',
            type='PDF',
            status='Approved',
            revision=1,
            category='Drawing',
            linked_pl=self.pl_item.id,
            file=SimpleUploadedFile('old.txt', b'old'),
        )
        PlDocumentLink.objects.create(pl_item=self.pl_item, document=previous, link_role='GENERAL')

        latest = Document.objects.create(
            id='DOC-T-NEW',
            name='Brake Drawing Pack',
            description='Latest revision',
            type='PDF',
            status='In Review',
            revision=2,
            category='Drawing',
            linked_pl=self.pl_item.id,
            file=SimpleUploadedFile('new.txt', b'new'),
        )

        response = self.client.post(
            '/api/v1/pl-items/12345678/documents/link/',
            {'document_id': latest.id, 'link_role': 'GENERAL'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)

        review = SupervisorDocumentReview.objects.get(pl_item=self.pl_item, latest_document=latest, status='PENDING')

        list_response = self.client.get('/api/v1/supervisor-document-reviews/')
        self.assertEqual(list_response.status_code, 200)
        payload = list_response.data
        if isinstance(payload, list):
            self.assertEqual(len(payload), 1)
        else:
            results = payload.get('results', [])
            self.assertEqual(payload.get('count', len(results)), 1)
            self.assertEqual(len(results), 1)

        approve_response = self.client.post(
            f'/api/v1/supervisor-document-reviews/{review.id}/approve/',
            {'notes': 'Revision accepted'},
            format='json',
        )
        self.assertEqual(approve_response.status_code, 200)

        review.refresh_from_db()
        previous.refresh_from_db()
        self.assertEqual(review.status, 'APPROVED')
        self.assertEqual(previous.status, 'Obsolete')
        self.assertTrue(
            DomainEvent.objects.filter(
                event_type='DesignSupervisorApprovedDocumentChange',
                aggregate_type='SupervisorDocumentReview',
                aggregate_id=str(review.id),
            ).exists()
        )

    def test_supervisor_document_review_can_be_bypassed(self):
        previous = Document.objects.create(
            id='DOC-T-OL2',
            name='Cooling Layout Sheet',
            description='Older revision',
            type='PDF',
            status='Approved',
            revision=1,
            category='Drawing',
            linked_pl=self.pl_item.id,
            file=SimpleUploadedFile('old2.txt', b'old2'),
        )
        PlDocumentLink.objects.create(pl_item=self.pl_item, document=previous, link_role='GENERAL')

        latest = Document.objects.create(
            id='DOC-T-NE2',
            name='Cooling Layout Sheet',
            description='Latest revision',
            type='PDF',
            status='In Review',
            revision=2,
            category='Drawing',
            linked_pl=self.pl_item.id,
            file=SimpleUploadedFile('new2.txt', b'new2'),
        )
        self.client.post(
            '/api/v1/pl-items/12345678/documents/link/',
            {'document_id': latest.id, 'link_role': 'GENERAL'},
            format='json',
        )
        review = SupervisorDocumentReview.objects.get(pl_item=self.pl_item, latest_document=latest, status='PENDING')

        bypass_response = self.client.post(
            f'/api/v1/supervisor-document-reviews/{review.id}/bypass/',
            {'bypass_reason': 'Temporary hold requested by design office'},
            format='json',
        )
        self.assertEqual(bypass_response.status_code, 200)

        review.refresh_from_db()
        self.assertEqual(review.status, 'BYPASSED')
        self.assertEqual(review.bypass_reason, 'Temporary hold requested by design office')
        self.assertTrue(
            DomainEvent.objects.filter(
                event_type='DesignSupervisorBypassedDocumentChange',
                aggregate_type='SupervisorDocumentReview',
                aggregate_id=str(review.id),
            ).exists()
        )
