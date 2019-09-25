import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/primeng';

import { EditControlBarComponent } from './editcontrolbar.component';

/**
 * A module provide classes for controlling metadata editing.  
 * 
 * Includes:
 *  * a EditControlBarComponent -- a GUI panel containing the control buttons
 */
@NgModule({
    imports: [
        CommonModule, ButtonModule
    ],
    declarations: [
        EditControlBarComponent
    ],
    exports: [
        EditControlBarComponent
    ]
})
export class EditControlModule { }

    
    
