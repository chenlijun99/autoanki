import { Command } from 'api/types';

export class ConfigCommand implements Command {
  readonly name = 'autoanki.config';

  readonly label = 'Config autoanki';

  readonly iconName = 'fas fa-config';

  execute = async (...args: any[]) => {
    console.log(args);
  };
}
