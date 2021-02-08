import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { TreeModule, FieldsetModule, DialogModule, OverlayPanelModule,
         ConfirmDialogModule, MenuModule } from 'primeng/primeng';
import { TreeTableModule } from 'primeng/treetable';

import { LandingComponent } from './landing.component';
import { DataFilesComponent } from './data-files/data-files.component';
import { DescriptionComponent } from './description/description.component';
import { TopicComponent } from './topic/topic.component';
import { KeywordComponent } from './keyword/keyword.component';
import { MetadataComponent } from './metadata/metadata.component';
import { NoidComponent } from './noid.component';
import { NerdmComponent } from './nerdm.component';
import { KeyValuePipe } from './keyvalue.pipe';
import { MetadataView } from './metadata/metadataview.component';

@NgModule({
  declarations: [
    LandingComponent,DataFilesComponent,
    DescriptionComponent, TopicComponent, KeywordComponent,
    MetadataComponent, 
    NoidComponent, NerdmComponent,KeyValuePipe,MetadataView
  ],
  imports: [
    CommonModule,SharedModule,TreeModule,FieldsetModule, DialogModule, OverlayPanelModule,
      ConfirmDialogModule, MenuModule,TreeTableModule
  ],
  exports:[
    LandingComponent, DataFilesComponent, 
    DescriptionComponent, TopicComponent, KeywordComponent, MetadataComponent,
    NoidComponent, NerdmComponent,KeyValuePipe,MetadataView
  ]
})
export class LandingModule { }
