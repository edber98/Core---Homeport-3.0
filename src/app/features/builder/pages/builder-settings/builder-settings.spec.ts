import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderSettings } from './builder-settings';

describe('BuilderSettings', () => {
  let component: BuilderSettings;
  let fixture: ComponentFixture<BuilderSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuilderSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
