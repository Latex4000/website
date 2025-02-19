import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import db from "./db";

abstract class Factory<T extends SQLiteTable> {
    protected abstract definition: { [K in keyof InferInsertModel<T>]: InferInsertModel<T>[K] | ((attributes: Partial<InferInsertModel<T>>) => InferInsertModel<T>[K]) };

    #count = 1;

    /**
     * Create `T`s and store them to the DB
     * @param definition Overrides for the base definition
     */
    create(definition?: Partial<Factory<T>["definition"]>): Promise<InferSelectModel<T>[]> {
        const mergedDefinition = { ...this.definition, ...definition };
        const insertValues: InferInsertModel<T>[] = [];

        for (let i = 0; i < this.#count; i++) {
            const insertValue: Partial<InferInsertModel<T>> = {};

            // Difficult to type well
            for (const [key, value] of Object.entries(mergedDefinition) as [keyof typeof mergedDefinition, any][]) {
                // There may be extra keys in `mergedDefinition` not included in the class's definition
                if (key in this.definition) {
                    insertValue[key] = typeof value === "function" ? value(insertValue) : value;
                }
            }

            insertValues.push(insertValue as InferInsertModel<T>);
        }

        return this.insert(insertValues);
    }

    /**
     * Set the amount of `T` this factory will create
     */
    count(count: number): this {
        this.#count = count;
        return this;
    }

    protected abstract insert(values: InferInsertModel<T>[]): Promise<InferSelectModel<T>[]>;
}

/**
 * Define a factory for an SQLite table for use in testing or seeding
 * @param table SQLite table definition
 * @param definition Insert values for the table or getters for those values. Getters are called with the resolved values of the columns defined above
 */
export default function defineFactory<T extends SQLiteTable>(table: T, definition: Factory<T>["definition"]): new () => Factory<T> {
    return class extends Factory<T> {
        override definition = definition;
        // Idk how to type properly
        override insert: Factory<T>["insert"] = (values) => db.insert(table).values(values).returning() as any;
    };
}
