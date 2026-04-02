class WorkLedger:
    def __init__(self, work_id, work_type):
        self.work_id = work_id
        self.work_type = work_type


class EntitySearchIndexManager:
    def update_or_create(self, entity_type, entity_identifier, defaults):
        pass


class EntitySearchIndex:
    objects = EntitySearchIndexManager()


def upsert_work_record_index(record: WorkLedger) -> EntitySearchIndex:
    return EntitySearchIndex.objects.update_or_create(
        entity_type='WORK',
        entity_identifier=record.work_id,
        defaults={
            'title': record.work_type,
        },
    )[0]
