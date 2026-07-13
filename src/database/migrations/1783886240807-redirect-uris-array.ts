import { MigrationInterface, QueryRunner } from "typeorm";

export class RedirectUrisArray1783886240807 implements MigrationInterface {
    name = 'RedirectUrisArray1783886240807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4ba6d0c734d53f8e1b2e24b6c56" UNIQUE ("username"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "oauth_clients" ("id" SERIAL NOT NULL, "clientName" character varying NOT NULL, "redirectUris" text NOT NULL, "clientSecret" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_eaa26672030dde4bbfe34a963d1" UNIQUE ("clientSecret"), CONSTRAINT "PK_c4759172d3431bae6f04e678e0d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "oauth_clients"`);
        await queryRunner.query(`DROP TABLE "admins"`);
    }

}
