import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';

import { NerdmModule } from '../nerdm/nerdm.module';
import { LandingPageComponent } from './landingPage.component';
import { LandingModule } from '../landing/landing.module';
import { ToolsModule } from './tools/tools.module';

/**
 * A module supporting the complete display of landing page content associated with 
 * a resource identifier
 */
@NgModule({
    imports: [
        CommonModule,
        NerdmModule,    // provider for MetadataService (which depends on AppConfig)
        LandingModule,
        ToolsModule,
        ButtonModule
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
    
