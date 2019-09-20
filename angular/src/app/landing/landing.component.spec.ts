import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing'; 
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { LandingComponent } from './landing.component';
import { MenuModule,DialogModule,FieldsetModule } from 'primeng/primeng';
import {TreeModule,TreeNode} from 'primeng/primeng';

import { Collaspe } from './collapseDirective/collapse.directive';
import {DescriptionComponent} from './description/description.component';
// import { MetadataComponent } from './metadata/metadata.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA,NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpModule } from '@angular/http';
import { SearchService } from '../shared/index';
import 'rxjs/add/observable/from';
import { AppConfig } from '../config/config';
import { TransferState } from '@angular/platform-browser';
import { AngularEnvironmentConfigService } from '../config/config.service';
import { CommonVarService } from '../shared/common-var';
import { ModalService } from '../shared/modal-service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { GoogleAnalyticsService } from '../shared/ga-service/google-analytics.service';
import { ToastrModule } from 'ngx-toastr';

import { CartService } from "../datacart/cart.service";
import { DownloadService } from "../shared/download-service/download-service.service";
import { TestDataService } from '../shared/testdata-service/testDataService';
import { testdata } from '../../environments/environment';

describe('Landing Component', () => {
    let component: LandingComponent;
    let fixture: ComponentFixture<LandingComponent>;
    let cfg : AppConfig;
    let plid : Object = "browser";
    let ts : TransferState = new TransferState();
    let de: DebugElement;

    let nrd = testdata['test1'];

    beforeEach(async(() => {
      cfg = (new AngularEnvironmentConfigService(plid, ts)).getConfig() as AppConfig;
      cfg.locations.pdrSearch = "https://goob.nist.gov/search";
      cfg.status = "Unit Testing";
      cfg.appVersion = "2.test";

      TestBed.configureTestingModule({
      declarations: [ LandingComponent, Collaspe,DescriptionComponent ],
      imports:[
          MenuModule,DialogModule, FormsModule, TreeModule,FieldsetModule, HttpModule,
          RouterTestingModule, HttpClientTestingModule, BrowserAnimationsModule,
          ToastrModule.forRoot()
      ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ,NO_ERRORS_SCHEMA],
      providers: [
          CommonVarService, CartService, DownloadService, TestDataService,
          GoogleAnalyticsService, ModalService,
          { provide: AppConfig, useValue: cfg }
      ]
      })
      .compileComponents();
    }));

    beforeEach(() => {
      fixture = TestBed.createComponent(LandingComponent);
      component = fixture.componentInstance;
      component.record = nrd;
      component.inBrowser = true;
      fixture.detectChanges();
    });

    it('should check the landing component', async(() => {
      expect(component).toBeTruthy();
    }));
});
