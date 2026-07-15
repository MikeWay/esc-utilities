import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CheckInOrOutComponent } from './check-in-or-out.component';

describe('CheckInOrOutComponent', () => {
  let component: CheckInOrOutComponent;
  let fixture: ComponentFixture<CheckInOrOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckInOrOutComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInOrOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
