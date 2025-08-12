import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fields } from './fields';

describe('Fields', () => {
  let component: Fields;
  let fixture: ComponentFixture<Fields>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fields]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fields);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
