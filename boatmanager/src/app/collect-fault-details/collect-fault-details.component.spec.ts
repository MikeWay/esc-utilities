import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CollectFaultDetailsComponent } from './collect-fault-details.component';

describe('CollectFaultDetailsComponent', () => {
  let component: CollectFaultDetailsComponent;
  let fixture: ComponentFixture<CollectFaultDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectFaultDetailsComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { defect: { defectType: { name: 'Test Defect' }, additionalInfo: '' } } },
        { provide: MatDialogRef, useValue: { close: () => {} } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectFaultDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
