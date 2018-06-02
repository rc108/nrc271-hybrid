class nrc271 extends Ownable {
 
    constructor () {
        super();

        LocalContractStorage.defineProperties(this, {
            _name: null,
            _price: null,
            _symbol: null,
            _supply: null,
            _license: null,
            _assetUrl: null,
            _dnaLength: null,
            _tokenCounter: null
        });

        LocalContractStorage.defineMapProperties(this, {
            "_tokens": null,
            "ownedTokensCount": {
                parse: function (value) {
                    return new BigNumber(value);
                },
                stringify: function (o) {
                    return o.toString(10);
                }
            },
            "tokenApprovals": null,
            "operatorApprovals": {
                parse: function (value) {
                    return new Operator(value);
                },
                stringify: function (o) {
                    return o.toString();
                }
            },
            
        });

    } 

    init (name, price, symbol, supply, license, assetUrl, dnaLength) {

        const dna = parseInt(dnaLength);

        if (dna > 20) {
            throw Error('Dna length limit is 20!');
        }

        if (dna <= 0) {
            throw Error('Dna must be higher than 0!');
        }

        this._name = name;
        this._price = price;
        this._symbol = symbol;
        this._supply = supply;
        this._license = license;
        this._assetUrl = assetUrl;
        this._dnaLength = dnaLength;

        // Start counter
        this._tokenCounter = 0;

        // Init ownable
        this._owner = Blockchain.transaction.from;

    }

    // EVENTS 
    // ******
    
    _mintEvent (status, _token) {
        Event.Trigger('mintEvent', {
            Status: status,
            Mint: _token
        });
    }

    _transferEvent (status, _from, _to, _id) {
        Event.Trigger('transferEvent', {
            Status: status,
            Transfer: {
                from: _from,
                to: _to,
                tokenId: _id
            }
        });
    }

    _approveEvent (status, _owner, _spender, _id) {
        Event.Trigger('approveEvent', {
            Status: status,
            Approve: {
                owner: _owner,
                spender: _spender,
                tokenId: _id
            }
        });
    }

    // PRIVATE
    // *******
    
    _mintSecurity (_value, _price) {
        
        // Check price 

        if (_value.lt(_price)) {
            throw Error("Insufficient payment.");
        }

        if (_value.gt(_price)) {
            throw Error("Over payment detected.");
        }

        // Check supply

        if (this._tokenCounter >= this._supply) {
            throw Error("The token supply has been filled.");
        }

    }

    _generateId () {

        return this._tokenCounter += 1;

    }

    _generateDna (length) {

        return Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1));

    }

    _mint () {

        const id = this._generateId();
        const from = Blockchain.transaction.from;
        const dna = this._generateDna(this._dnaLength);

        const token = {
            id: id, 
            dna: dna,
            owner: from
        };

        // Call private method
        this._tokens.put(id, token);

        const tokenCount = this.ownedTokensCount.get(from) || new BigNumber(0);
        this.ownedTokensCount.set(from, tokenCount.add(1));

        this._mintEvent(true, token);

    }

    _transfer (_from, _to, _id) {

        const token = this._tokens.get(_id);

        this._tokens.set(token.id, {
            id: token.id,
            dna: token.dna,
            owner: _to
        });

        // Decrement from
        const fromTokenCount = this.ownedTokensCount.get(_from);

        if (fromTokenCount.lt(1)) {
            throw new Error("Insufficient account balance in transfer.");
        }

        this.ownedTokensCount.set(_from, fromTokenCount.sub(1));

        // Increment to
        const toTokenCount = this.ownedTokensCount.get(_to) || new BigNumber(0);
        this.ownedTokensCount.set(_to, toTokenCount.add(1));

    }

    _clearApproval (_owner, _id) {

        const owner = this.ownerOf(_id);
        
        if (_owner != owner) {
            throw new Error("Permission denied in clear approval.");
        }

        this.tokenApprovals.del(_id);

    }

    // PUBLIC
    // ******

    name () {
        return this._name;
    }

    details () {
        return {
            name: this._name,
            price: this._price,
            symbol: this._symbol,
            supply: this._supply,
            license: this._license,
            assetUrl: this._assetUrl,
            dnaLength: this._dnaLength,
        }
    }

    tokens () {
        
        let tokens = [];

        for (let i = 1; i <= this._tokenCounter; i++) {

            const token = this._tokens.get(i);
            tokens.push(token);

        }

        return tokens;

    }

    tokenCounter () {
        return this._tokenCounter;
    }

    balanceOf (_owner) {

        const balance = this.ownedTokensCount.get(_owner);

        if (balance instanceof BigNumber) {
            return balance.toString(10);
        } else {
            return "0";
        }

    }

    ownerOf (_id) {
        return this._tokens.get(_id).owner;
    }

    approve (_to, _id) {

        const from = Blockchain.transaction.from;
        const owner = this.ownerOf(_id);

        if (_to == owner) {
            throw new Error("Invalid address in approve.");
        }

        if (owner == from || this.isApprovedForAll(owner, from)) {

            this.tokenApprovals.set(_id, _to);
            this._approveEvent(true, owner, _to, _id);

        } else {

            throw new Error("permission denied in approve.");

        }

    }

    getApproved (_id) {
        return this.tokenApprovals.get(_id);
    }

    setApprovalForAll (_to, _approved) {

        const from = Blockchain.transaction.from;
        if (from == _to) {
            throw new Error("invalid address in setApprovalForAll.");
        }

        const operator = this.operatorApprovals.get(from) || new Operator();
        operator.set(_to, _approved);
        this.operatorApprovals.set(from, operator);

    }

    isApprovedForAll (_owner, _operator) {

        const operator = this.operatorApprovals.get(_owner);
        if (operator != null) {
            if (operator.get(_operator) === "true") {
                return true;
            } else {
                return false;
            }
        }

    }

    isApprovedOrOwner (_spender, _id) {

        const owner = this.ownerOf(_id);
        return _spender == owner || this.getApproved(_id) == _spender || this.isApprovedForAll(owner, _spender);

    }

    transfer (_from, _to, _id) {

        const from = Blockchain.transaction.from;
        if (this.isApprovedOrOwner(from, _id)) {
            
            this._clearApproval(_from, _id);
            
            this._transfer(_from, _to, _id);

            this._transferEvent(true, _from, _to, _id);

        } else {

            throw new Error("Permission denied in transfer.");
        
        }
        
    }

    mint () {

        const nas = new BigNumber(10).pow(18);
        const value = new BigNumber(Blockchain.transaction.value);
        const price = new BigNumber(this._price).mul(nas);

        // Pass security
        this._mintSecurity(value, price);
  
        // Transfer funds
        if (value.gt(0)) {
            Blockchain.transfer(this._owner, value);
        }

        this._mint();

    }

    // OWNER METHODS

    ownerMint (_to, _dna) {

        const from = Blockchain.transaction.from;
        this._onlyOwner(from);

        const id = this._generateId();

        this._tokens.put(id, {
            id: id, 
            dna: _dna,
            owner: _to
        });

        const tokenCount = this.ownedTokensCount.get(_to) || new BigNumber(0);
        this.ownedTokensCount.set(_to, tokenCount.add(1));

    }

    updatePrice (_price) {

        const from = Blockchain.transaction.from;
        this._onlyOwner(from);
        this._price = _price;

    }

    updateDnaLength (_dnaLength) {
        
        const from = Blockchain.transaction.from;
        this._onlyOwner(from);

        const dna = parseInt(_dnaLength);

        if (dna > 20) {
            throw Error('Dna length limit is 20!');
        }

        if (dna <= 0) {
            throw Error('Dna must be higher than 0!');
        }

        this._dnaLength = _dnaLength;

    }

}

module.exports = nrc271;
