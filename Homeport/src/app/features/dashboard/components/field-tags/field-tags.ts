import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type ExprTag = { path: string; name?: string };

@Component({
  standalone: true,
  selector: 'app-field-tags',
  imports: [CommonModule],
  templateUrl: './field-tags.html',
  styleUrl: './field-tags.scss'
})
export class FieldTagsComponent {
  @Input() tags: ExprTag[] = [];
  private ghost?: HTMLElement;

  track = (_: number, t: ExprTag) => t.path;

  onDragStart(ev: DragEvent, tag: ExprTag) {
    if (!ev.dataTransfer) return;
    const payload = JSON.stringify(tag);
    ev.dataTransfer.setData('application/x-expression-tag', payload);
    ev.dataTransfer.setData('text/plain', tag.path);
    ev.dataTransfer.effectAllowed = 'copy';

    // Custom drag preview at bottom-right of cursor (not centered)
    try {
      const src = ev.target as HTMLElement;
      const ghost = src.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.95';
      document.body.appendChild(ghost);
      this.ghost = ghost;
      // Place image so its top-left is at the cursor => image appears bottom-right of cursor
      ev.dataTransfer.setDragImage(ghost, 0, 0);
      const onEnd = () => {
        window.removeEventListener('dragend', onEnd, true);
        try { this.ghost?.remove(); } catch {}
        this.ghost = undefined;
      };
      window.addEventListener('dragend', onEnd, true);
    } catch {}
  }
}
