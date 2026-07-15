import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-show-user-name',
  imports: [],
  templateUrl: './show-user-name.component.html',
  styleUrl: './show-user-name.component.sass'
})
export class ShowUserNameComponent {
  // input called userName
  @Input()
  public userName: string = ''; 


}
