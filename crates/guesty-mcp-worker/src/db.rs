//! A small database interface the store is written against: D1 in the Worker, SQLite in the
//! native unit tests, so the same SQL is tested both ways.

use std::future::Future;

use serde_json::{Map, Value};

#[derive(Clone, Debug, PartialEq)]
pub enum Param {
    Null,
    Int(i64),
    Text(String),
}

impl From<&str> for Param {
    fn from(value: &str) -> Self {
        Param::Text(value.to_string())
    }
}
impl From<String> for Param {
    fn from(value: String) -> Self {
        Param::Text(value)
    }
}
impl From<&String> for Param {
    fn from(value: &String) -> Self {
        Param::Text(value.clone())
    }
}
impl From<i64> for Param {
    fn from(value: i64) -> Self {
        Param::Int(value)
    }
}
impl From<bool> for Param {
    fn from(value: bool) -> Self {
        Param::Int(value as i64)
    }
}
impl<T: Into<Param>> From<Option<T>> for Param {
    fn from(value: Option<T>) -> Self {
        value.map(Into::into).unwrap_or(Param::Null)
    }
}

pub struct Stmt {
    pub sql: &'static str,
    pub params: Vec<Param>,
}

pub fn stmt(sql: &'static str, params: Vec<Param>) -> Stmt {
    Stmt { sql, params }
}

#[macro_export]
macro_rules! sql {
    ($sql:expr $(, $param:expr)* $(,)?) => {
        $crate::db::stmt($sql, vec![$($crate::db::Param::from($param)),*])
    };
}

pub type Row = Map<String, Value>;

#[derive(Debug, Default)]
pub struct Outcome {
    pub rows: Vec<Row>,
    pub changes: u64,
}

/// A database error. It carries no detail, so nothing from a query reaches a log.
#[derive(Debug, PartialEq)]
pub struct DbError;

pub trait Db {
    /// Runs the statements in one transaction, in order.
    fn batch(&self, statements: Vec<Stmt>) -> impl Future<Output = Result<Vec<Outcome>, DbError>>;

    fn run(&self, statement: Stmt) -> impl Future<Output = Result<Outcome, DbError>> {
        async move { self.batch(vec![statement]).await?.pop().ok_or(DbError) }
    }

    fn first(&self, statement: Stmt) -> impl Future<Output = Result<Option<Row>, DbError>> {
        async move { Ok(self.run(statement).await?.rows.into_iter().next()) }
    }
}

pub fn text(row: &Row, column: &str) -> Option<String> {
    row.get(column).and_then(Value::as_str).map(str::to_string)
}

pub fn int(row: &Row, column: &str) -> Option<i64> {
    match row.get(column)? {
        Value::Number(n) => n.as_i64().or_else(|| n.as_f64().map(|f| f as i64)),
        _ => None,
    }
}

#[cfg(test)]
pub mod sqlite {
    use std::cell::RefCell;

    use rusqlite::types::ValueRef;
    use serde_json::{Map, Value};

    use super::{Db, DbError, Outcome, Param, Stmt};

    pub struct SqliteDb(pub RefCell<rusqlite::Connection>);

    impl SqliteDb {
        pub fn migrated() -> SqliteDb {
            let conn = rusqlite::Connection::open_in_memory().unwrap();
            conn.execute_batch(include_str!("../migrations/0001_init.sql")).unwrap();
            SqliteDb(RefCell::new(conn))
        }
    }

    impl Db for SqliteDb {
        async fn batch(&self, statements: Vec<Stmt>) -> Result<Vec<Outcome>, DbError> {
            let mut conn = self.0.borrow_mut();
            let tx = conn.transaction().map_err(|_| DbError)?;
            let mut outcomes = Vec::new();
            for statement in statements {
                let mut prepared = tx.prepare(statement.sql).map_err(|e| panic!("{e}: {}", statement.sql))?;
                let columns: Vec<String> = prepared.column_names().map(|c| c.to_string()).collect();
                let readonly = prepared.readonly();
                let params: Vec<rusqlite::types::Value> = statement
                    .params
                    .into_iter()
                    .map(|p| match p {
                        Param::Null => rusqlite::types::Value::Null,
                        Param::Int(i) => rusqlite::types::Value::Integer(i),
                        Param::Text(t) => rusqlite::types::Value::Text(t),
                    })
                    .collect();
                let mut rows = prepared.query(rusqlite::params_from_iter(params)).map_err(|_| DbError)?;
                let mut out = Vec::new();
                while let Some(row) = rows.next().map_err(|_| DbError)? {
                    let mut map = Map::new();
                    for (i, name) in columns.iter().enumerate() {
                        let value = match row.get_ref(i).map_err(|_| DbError)? {
                            ValueRef::Null => Value::Null,
                            ValueRef::Integer(n) => Value::from(n),
                            ValueRef::Real(f) => Value::from(f),
                            ValueRef::Text(t) => Value::from(String::from_utf8_lossy(t).into_owned()),
                            ValueRef::Blob(_) => Value::Null,
                        };
                        map.insert(name.clone(), value);
                    }
                    out.push(map);
                }
                drop(rows);
                drop(prepared);
                let changes = if readonly { 0 } else { tx.changes() };
                outcomes.push(Outcome { rows: out, changes });
            }
            tx.commit().map_err(|_| DbError)?;
            Ok(outcomes)
        }
    }

    /// Runs a future that never waits (SQLite answers at once).
    pub fn block_on<F: std::future::Future>(future: F) -> F::Output {
        let mut future = std::pin::pin!(future);
        let mut cx = std::task::Context::from_waker(std::task::Waker::noop());
        loop {
            if let std::task::Poll::Ready(value) = future.as_mut().poll(&mut cx) {
                return value;
            }
        }
    }
}
