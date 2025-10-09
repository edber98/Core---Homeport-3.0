import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzRadioModule,
    NzInputModule,
    NzLayoutModule,
    NzSelectModule,
    NzCheckboxModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

  types: any = [{
    name: "String",
    icon: 'string',
    description: 'Une chaine de caractère'
  },
  {
    name: "Number",
    icon: 'number',
    description: 'Un nombre à sauvegarder'
  }]

  schemas_fields: any[] = [{
    _id: 'dsez1121DSD',
    name: 'field',
    label: 'Champs',
    type: 'String',
    required: true
  },
  {
    _id: 'dsez1121DSD2',
    name: 'age',
    label: 'Age',
    type: 'Number',
    required: true
  }];

  selected_item: any = null

  availableItems = ['Élément A', 'Élément B', 'Élément C'];


  selectItem(e: any) {
    this.selected_item = e
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      // Réorganisation dans la même liste
      moveItemInArray(this.schemas_fields, event.previousIndex, event.currentIndex);
    } else {
      // Duplication depuis la liste source
      let item: any = event.previousContainer.data[event.previousIndex];
      this.schemas_fields.splice(event.currentIndex, 0, { ...item,type: item.name, label: 'new champs', _id: (new Date()).getMilliseconds() }); // insérer à la position correcte
    }
  }
}
