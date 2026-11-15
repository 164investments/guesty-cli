//! [`Db`] on Cloudflare D1. A batch runs as one transaction.

use wasm_bindgen::JsValue;
use worker::D1Database;

use crate::db::{Db, DbError, Outcome, Param, Row, Stmt};

pub(crate) struct D1Db(pub D1Database);

impl Db for D1Db {
    async fn batch(&self, statements: Vec<Stmt>) -> Result<Vec<Outcome>, DbError> {
        let mut prepared = Vec::with_capacity(statements.len());
        for statement in statements {
            let params: Vec<JsValue> = statement
                .params
                .iter()
                .map(|p| match p {
                    Param::Null => JsValue::NULL,
                    Param::Int(i) => JsValue::from_f64(*i as f64),
                    Param::Text(t) => JsValue::from_str(t),
                })
                .collect();
            prepared.push(self.0.prepare(statement.sql).bind(&params).map_err(|_| DbError)?);
        }
        let results = self.0.batch(prepared).await.map_err(|_| DbError)?;
        results
            .into_iter()
            .map(|result| {
                let rows: Vec<Row> = result.results().map_err(|_| DbError)?;
                let changes = result.meta().ok().flatten().and_then(|m| m.changes).unwrap_or(0) as u64;
                Ok(Outcome { rows, changes })
            })
            .collect()
    }
}
