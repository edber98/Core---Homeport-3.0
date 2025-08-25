import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({ providedIn: 'root' })
export class UiMessageService {
  constructor(private msg: NzMessageService) {}
  success(m: string) { this.msg.success(m); }
  info(m: string) { this.msg.info(m); }
  warning(m: string) { this.msg.warning(m); }
  error(m: string) { this.msg.error(m); }
}

