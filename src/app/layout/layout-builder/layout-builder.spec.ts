import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutBuilder } from './layout-builder';

describe('LayoutBuilder', () => {
  let component: LayoutBuilder;
  let fixture: ComponentFixture<LayoutBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
