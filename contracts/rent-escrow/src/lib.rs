#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map};
use soroban_sdk::contracterror;

// Define Error Enum
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientFunding = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct RentEscrow {
    pub landlord: Address,
    pub rent_amount: i128,
    pub roommates: Map<Address, i128>,  // roommate -> their share
    pub contributions: Map<Address, i128>, // roommate -> amount contributed
}

#[contract]
pub struct RentEscrowContract;

#[contractimpl]
impl RentEscrowContract {

    /// Initialize the escrow with landlord, rent amount, and roommates
    pub fn initialize(
        env: Env,
        landlord: Address,
        rent_amount: i128,
        roommates: Map<Address, i128>,
    ) -> Result<(), Error> {
        if rent_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage().instance().set(&"escrow", &RentEscrow {
            landlord,
            rent_amount,
            roommates,
            contributions: Map::new(&env),
        });

        Ok(())
    }

    /// Roommates call this to contribute their share of the rent
    pub fn contribute(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        // Guard: amount must be positive
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        from.require_auth();

        let mut escrow: RentEscrow = env.storage().instance().get(&"escrow").unwrap();

        // Guard: 'from' must be a valid roommate
        if !escrow.roommates.contains_key(from.clone()) {
            return Err(Error::InvalidAmount);
        }

        // Update contributions map
        let current: i128 = escrow.contributions.get(from.clone()).unwrap_or(0);
        escrow.contributions.set(from.clone(), current + amount);

        env.storage().instance().set(&"escrow", &escrow);

        Ok(())
    }

    /// Release total rent to the landlord if fully funded
    pub fn release(env: Env) -> Result<(), Error> {
        let escrow: RentEscrow = env.storage().instance().get(&"escrow").unwrap();

        // Calculate total contributions
        let mut total_contributed: i128 = 0;
        for (_, amount) in escrow.contributions.iter() {
            total_contributed += amount;
        }

        // Guard: total contributions must meet rent amount
        if total_contributed < escrow.rent_amount {
            return Err(Error::InsufficientFunding);
        }

        // TODO: Transfer total_contributed tokens to escrow.landlord

        Ok(())
    }
}

mod test;
