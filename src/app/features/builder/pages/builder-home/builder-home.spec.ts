import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderHome } from './builder-home';

describe('BuilderHome', () => {
  let component: BuilderHome;
  let fixture: ComponentFixture<BuilderHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuilderHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
