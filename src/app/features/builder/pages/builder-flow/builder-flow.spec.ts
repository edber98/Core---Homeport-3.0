import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderFlow } from './builder-flow';

describe('BuilderFlow', () => {
  let component: BuilderFlow;
  let fixture: ComponentFixture<BuilderFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderFlow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuilderFlow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
