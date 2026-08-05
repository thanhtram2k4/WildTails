import { Module } from '@nestjs/common';
import { JournalController } from './journal/journal.controller';
import { JournalService } from './journal/journal.service';
import { JournalPermissionService } from './journal/journal-permission.service';
import { FolderController } from './folder/folder.controller';
import { FolderService } from './folder/folder.service';
import { TagController } from './tag/tag.controller';
import { TagService } from './tag/tag.service';
import { ShareController } from './share/share.controller';
import { ShareService } from './share/share.service';
import { GoalController } from './goal/goal.controller';
import { GoalService } from './goal/goal.service';

@Module({
  controllers: [
    JournalController,
    FolderController,
    TagController,
    ShareController,
    GoalController,
  ],
  providers: [
    JournalService,
    JournalPermissionService,
    FolderService,
    TagService,
    ShareService,
    GoalService,
  ],
  exports: [JournalPermissionService],
})
export class KnowledgeModule {}
