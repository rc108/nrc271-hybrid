class Ownable {

    constructor () {

        LocalContractStorage.defineProperty(this, "_owner"); 

    }

    // EVENT

    _transferOwnershipEvent (status, _from, _to) {
        Event.Trigger("transferOwnership", {
            Status: status,
            TransferOwnership: {
                from: _from,
                to: _to
            }
        });
    }

    // PRIVATE

    _verifyAddress (address) {

    	if (!Blockchain.verifyAddress(address)) {
            throw Error('The to address is not valid!');
        }

    }

    _onlyOwner (from) {

        if (this._owner != from) {
            
            throw Error('You are not the owner!');

        } 

    }

    // PUBLIC 

    transferOwnership (to) {

        const from = Blockchain.transaction.from;

        this._onlyOwner(from);
        this._verifyAddress(to);

        // Update owner
        this._owner = to;

        // Notify the client
        this._transferOwnershipEvent(true, from, to);

    }

}