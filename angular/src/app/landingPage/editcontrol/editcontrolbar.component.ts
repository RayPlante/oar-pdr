import { Component, Optional, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { ConfirmationDialogService } from '../../shared/confirmation-dialog/confirmation-dialog.service';
import { UserMessageService } from '../../frame/usermessage.service';
import { NerdmRes } from '../../nerdm/nerdm';

/**
 * A panel containing buttons that control editing and saving of the metadata record
 * 
 * Features include:
 *  * an Edit button that enables the editing controls on the landing page.
 *  * a Save button that commits the changes made so far.  
 *  * a Discard button that throws away all changes and reverts the page to its original data.
 */
@Component({
    selector: 'pdr-edit-control',
    templateUrl: 'editcontrolbar.component.html',
    styleUrls: [ 'editcontrolbar.component.css'   ],
    providers: [
        ConfirmationDialogService
    ]
})
export class EditControlBarComponent {

    private editMode : boolean = false;
    @Output() editModeChanged : EventEmitter<boolean> = new EventEmitter<boolean>();
    @Output() updatedMD : EventEmitter<NerdmRes> = new EventEmitter<NerdmRes>();

    public constructor(private confirmDialogSvc : ConfirmationDialogService,
                       @Optional() private msgsvc : UserMessageService)
    {
    }

    ngAfterViewInit() {
        this.msgsvc.instruct("To see previously edited data or edit current data, click on Edit button.");
    }

    /**
     * return true if the metadata are currently being edited.  If true, the Edit button will be 
     * disabled and the Save and Discard buttons will be enabled.  
     */
    public isEditing() : boolean { return this.editMode; }

    /**
     * turn editing on or off.  The buttons will be enabled/disabled accordingly.
     * @param onoff    if true, turn editing on; otherwise turn it off.
     */
    public enableEditing(onoff : boolean) : void {
        this.editMode = onoff;
        this.editModeChanged.emit(this.editMode);
    }

    /**
     * commit the latest changes.  This pushes changes to the PDR's pre-publication metadata server
     * and to MIDAS.  
     */
    public startEditing() : void {
        // turn editing mode on:
        //   * authenticate user
        //   * use the customization service to retrieve metadata
        //   * send the update metadata to the parent (via updatedMD)
        //   * update the message bar with the time of last modification
        //
        this.enableEditing(true);

        // stand-in until customization service plugged in
        let newmd = { 'modified': '2019-01-01 07:38:11' }
        // this.updatedMD.next(newmd)

        // update the message bar with the time of last modification
        if ('modified' in newmd)
            this.msgsvc.instruct("This record was last updated on "+newmd['modified']+".");
        else if ('issued' in newmd)
            this.msgsvc.instruct("This record was last updated on "+newmd['issued']+".");
        else
            this.msgsvc.instruct("This record is unmodified")
    }

    /**
     * commit the latest changes.  This pushes changes to the PDR's pre-publication metadata server
     * and to MIDAS.  
     */
    public saveEdits() : void {
        // push the changes
        //
        // authenticate user
        // 
        this.enableEditing(false);
    }

    /**
     * discard the latest changes.  This will revert the data to its previous state.
     */
    public discardEdits() : void {
        // throw changes away
        //
        // authenticate user
        // 
        this.enableEditing(false);
    }

    /**
     * discard the latest changes.  This will revert the data to its previous state.
     */
    public confirmDiscardEdits() : void {
        this.confirmDialogSvc.confirm('Edited data will be lost', 'Do you want to erase changes?')
            .then( (confirmed) => {
                if (confirmed) 
                    this.discardEdits()
                else
                    console.log("User canceled discard request")
            })
            .catch( () => {
                console.log("User canceled discard request (indirectly)");
            })
    }

    

    /**
     * return true if the current user is authorized to edit the current record.  This may trigger 
     * an authentication process.
    public userIsAuthorized() : boolean {
        return true;
    }
     */
}
