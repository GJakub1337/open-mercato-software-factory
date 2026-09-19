import { Migration } from '@mikro-orm/migrations';

export class Migration20260919121846_task_delegation extends Migration {

  override name = 'Migration20260919121846';

  override up(): void | Promise<void> {
    this.addSql(`create table "task_delegations" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "task_id" uuid not null, "project_id" uuid not null, "delegate_user_id" uuid not null, "delegated_by" uuid not null, "assignee_user_id" uuid not null, "process_instance_id" uuid null, "links" jsonb not null default '[]', "outcome" varchar(20) null, "close_reason" text null, "released_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create unique index "task_delegations_active_task_uq" on "task_delegations" ("organization_id", "task_id") where "released_at" is null;`);
    this.addSql(`create index "task_delegations_process_idx" on "task_delegations" ("organization_id", "process_instance_id");`);
    this.addSql(`create index "task_delegations_task_history_idx" on "task_delegations" ("organization_id", "task_id", "created_at");`);
    this.addSql(`create index "task_delegations_tenant_org_idx" on "task_delegations" ("tenant_id", "organization_id");`);

    this.addSql(`create table "task_delegation_process_writes" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "task_id" uuid not null, "process_instance_id" uuid not null, "step_id" varchar(100) not null, "command_id" varchar(100) not null, "result" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create unique index "task_delegation_process_writes_step_uq" on "task_delegation_process_writes" ("organization_id", "task_id", "process_instance_id", "step_id");`);
    this.addSql(`create index "task_delegation_process_writes_tenant_org_idx" on "task_delegation_process_writes" ("tenant_id", "organization_id");`);
  }

}
