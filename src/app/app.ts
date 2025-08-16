import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Connection, ConnectionSettings, Edge, Vflow } from 'ngx-vflow';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Vflow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Kinn');
  
}
