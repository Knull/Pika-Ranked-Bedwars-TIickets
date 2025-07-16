import { Client, Collection } from 'discord.js';

export interface CommandModule {
  data: any; 
  execute: (interaction: any) => Promise<void>;
  autocomplete?: (interaction: any) => Promise<void>;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, CommandModule>;
}
