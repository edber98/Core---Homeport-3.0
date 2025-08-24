import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout-auth',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './layout-auth.html',
  styleUrl: './layout-auth.scss'
})
export class LayoutAuth {}

