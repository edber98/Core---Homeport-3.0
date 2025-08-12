import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Inspector } from './inspector';

describe('Inspector', () => {
  let component: Inspector;
  let fixture: ComponentFixture<Inspector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inspector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inspector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
