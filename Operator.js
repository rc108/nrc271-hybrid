class Operator {
    
    constructor (obj) {
        this.operator = {};
        this.parse(obj);
    }

    toString () {
        return JSON.stringify(this.operator);
    }

    parse (obj) {
        if (typeof obj != "undefined") {
            var data = JSON.parse(obj);
            for (var key in data) {
                this.operator[key] = data[key];
            }
        }
    }

    get (key) {
        return this.operator[key];
    }

    set (key, value) {
        this.operator[key] = value;
    }

}