import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';

import { FrameModule } from '../frame/frame.module';
import { NerdmModule } from '../nerdm/nerdm.module';
import { LandingPageComponent } from './landingPage.component';
import { LandingModule } from '../landing/landing.module';

/**
 * A module supporting the complete display of landing page content associated with 
 * a resource identifier
 */
@NgModule({
    imports: [
        CommonModule,
        NerdmModule,    // provider for MetadataService (which depends on AppConfig)
        FrameModule,
        LandingModule
    ],
    declarations: [
        LandingPageComponent,
    ],
    providers: [
    ],
    exports: [
        LandingPageComponent
    ]
})
export class LandingPageModule { }

export { LandingPageComponent };
    
