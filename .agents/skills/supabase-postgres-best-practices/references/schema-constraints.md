---
title: Add Constraints Safely in Migrations
impact: HIGH
impactDescription: Prevents migration failures and enables idempotent schema changes
tags: constraints, migrations, schema, alter-table
---

## Add Constraints Safely in Migrations

PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`. Migrations using this syntax will fail.

**Incorrect (causes syntax error):**

```sql
-- ERROR: syntax error at or near "not" (SQLSTATE 42601)
alter table public.profiles
add constraint if not exists profiles_birthchart_id_unique unique (birthchart_id);
```

**Correct (idempotent constraint creation):**

```sql
-- Guard repeatable migrations because Postgres lacks ADD CONSTRAINT IF NOT EXISTS
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_birthchart_id_unique'
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_birthchart_id_unique unique (birthchart_id);
  end if;
end $$;
```

For all constraint types:

```sql
-- Scope the lookup to one table so same-named constraints elsewhere do not block the migration
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'check_age_positive'
    and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
    add constraint check_age_positive check (age > 0);
  end if;
end $$;

-- Scope the lookup to one table so reruns only skip the foreign key already attached there
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_birthchart_id_fkey'
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_birthchart_id_fkey
    foreign key (birthchart_id) references public.birthcharts(id);
  end if;
end $$;
```

Check if constraint exists:

```sql
-- Query to check constraint existence
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.profiles'::regclass;

-- contype values:
-- 'p' = PRIMARY KEY
-- 'f' = FOREIGN KEY
-- 'u' = UNIQUE
-- 'c' = CHECK
```

Reference: [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
