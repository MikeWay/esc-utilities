import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TellUsWhyComponent } from './tell-us-why.component';
import { HttpClient } from '@angular/common/http';

describe('TellUsWhyComponent', () => {
  let component: TellUsWhyComponent;
  let fixture: ComponentFixture<TellUsWhyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TellUsWhyComponent],
      providers: [HttpClient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TellUsWhyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
