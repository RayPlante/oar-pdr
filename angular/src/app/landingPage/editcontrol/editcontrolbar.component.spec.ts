import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditControlBarComponent } from './editcontrolbar.component';

fdescribe('EditControlBarComponent', () => {
    let component : EditControlBarComponent;
    let fixture : ComponentFixture<EditControlBarComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ EditControlBarComponent ],
            providers: []
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EditControlBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

    })

    it('should set up into a non-editing state', () => {
        expect(component).toBeDefined();
        expect(component.isEditing()).toBe(false);
        fixture.detectChanges();

        let cmpel = fixture.nativeElement;
        let buttons = cmpel.querySelectorAll(".ecbutton");
        expect(buttons.length).toEqual(3);
        for (let button of buttons) {
            if (button.id == "ecEdit")
                expect(button.disabled).toBe(false);
            else if (button.id == "ecSave")
                expect(button.disabled).toBe(true);
            else if (button.id == "ecDiscard")
                expect(button.disabled).toBe(true);
            else
                fail("Unexpected button");
        }
    });

    it('can enable editing', () => {
        expect(component).toBeDefined();
        component.enableEditing(true);
        expect(component.isEditing()).toBe(true);

        let cmpel = fixture.nativeElement;
        let buttons = cmpel.querySelectorAll(".ecbutton");
        expect(buttons.length).toEqual(3);
        for (let button of buttons) {
            if (button.id == "ecEdit")
                expect(button.disabled).toBe(true);
            else if (button.id == "ecSave")
                expect(button.disabled).toBe(false);
            else if (button.id == "ecDiscard")
                expect(button.disabled).toBe(false);
            else
                fail("Unexpected button");
        }
    });
});

        
