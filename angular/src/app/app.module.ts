import { Title, Meta } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  APP_INITIALIZER, PLATFORM_ID, APP_ID, Inject,
  CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AppComponent } from './app.component';
import { LandingPageModule } from './landingPage/landingPage.module';
import { LandingAboutComponent } from './landingAbout/landingAbout.component';
import { ErrorComponent, UserErrorComponent } from './landing/error.component';
import { SharedModule } from './shared/shared.module';
import { CommonVarService } from './shared/common-var/index';
import { DatacartComponent } from './datacart/datacart.component';
import { CartService } from "./datacart/cart.service";
import { AppShellNoRenderDirective } from './directives/app-shell-no-render.directive';
import { AppShellRenderDirective } from './directives/app-shell-render.directive';
import { FragmentPolyfillModule } from "./fragment-polyfill.module";
import { DownloadService } from "./shared/download-service/download-service.service";
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectItem, DropdownModule, ConfirmationService, Message } from 'primeng/primeng';
import { ProgressBarModule } from 'primeng/progressbar';
import { TestDataService } from './shared/testdata-service/testDataService';
import { CommonFunctionService } from './shared/common-function/common-function.service';
import {enableProdMode} from '@angular/core';

// future
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ErrorHandler } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { FrameModule } from './frame/frame.module';
import { ConfigModule } from './config/config.module';
import { AppRoutingModule } from './app-routing.module';
import {GoogleAnalyticsService} from "./shared/ga-service/google-analytics.service";
import {GoogleAnalyticsServiceMock} from "./shared/ga-service/google-analytics.service.mock";


enableProdMode();
// used to create fake backend
import { fakeBackendProvider } from './_helpers/fakeBackendInterceptor';

@NgModule({
  declarations: [
    AppComponent, CommonVarService,
    LandingAboutComponent, DatacartComponent,
    ErrorComponent, UserErrorComponent,
    AppShellNoRenderDirective, AppShellRenderDirective,
  ],
  imports: [
      HttpClientModule,
      ConfigModule,        // provider for AppConfig
      FrameModule,
      LandingPageModule,
      AppRoutingModule,

      FragmentPolyfillModule.forRoot({
          smooth: true
      }),
      FormsModule, ReactiveFormsModule,
      CommonModule, SharedModule, BrowserAnimationsModule, FormsModule, TooltipModule,
      ButtonModule, ProgressSpinnerModule, ProgressBarModule,
      NgbModule.forRoot()
  ],
  exports: [],
  providers: [
    Title,
    Meta,
    CommonVarService,
    CartService,
    DownloadService,
    TestDataService,
    ConfirmationService,
    CommonFunctionService,
    GoogleAnalyticsService,
    GoogleAnalyticsServiceMock
    // provider used to create fake backend
    // fakeBackendProvider
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})

export class AppModule {
  constructor(protected _googleAnalyticsService: GoogleAnalyticsService) { } // We inject the service here to keep it alive whole time
}


