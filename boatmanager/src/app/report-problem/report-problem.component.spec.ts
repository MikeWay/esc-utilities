import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { ReportProblemComponent } from './report-problem.component';

describe('ReportProblemComponent', () => {
  let component: ReportProblemComponent;
  let fixture: ComponentFixture<ReportProblemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportProblemComponent],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportProblemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
