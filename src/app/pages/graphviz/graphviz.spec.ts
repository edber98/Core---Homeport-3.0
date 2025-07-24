import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Graphviz } from './graphviz';

describe('Graphviz', () => {
  let component: Graphviz;
  let fixture: ComponentFixture<Graphviz>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Graphviz]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Graphviz);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
