import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmCheckInComponent } from './confirm-check-in.component';

describe('ConfirmCheckInComponent', () => {
  let component: ConfirmCheckInComponent;
  let fixture: ComponentFixture<ConfirmCheckInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmCheckInComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmCheckInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
