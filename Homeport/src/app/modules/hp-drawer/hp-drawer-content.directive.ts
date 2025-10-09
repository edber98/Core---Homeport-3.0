import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[nzDrawerContent]',
  standalone: true,
})
export class HpDrawerContentDirective {
  constructor(public templateRef: TemplateRef<any>) {}
}

