import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionEditorTestingComponent } from './expression-editor-testing-component';

describe('ExpressionEditorTestingComponent', () => {
  let component: ExpressionEditorTestingComponent;
  let fixture: ComponentFixture<ExpressionEditorTestingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpressionEditorTestingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpressionEditorTestingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
