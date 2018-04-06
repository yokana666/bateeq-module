"use strict";
const moduleId = "M-DISC";
var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var BateeqModels = require("bateeq-models");
var map = BateeqModels.map;
var generateCode = require('../../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var Discount = BateeqModels.inventory.master.Discount;
var StoreManager = require('../../master/store-manager');

module.exports = class DiscountManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.inventory.master.Discount);
        this.storeManager = new StoreManager(db, user);
    }

    _getQuery(paging) {

        var _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterDiscount = {
                "discount": {
                    "$regex": regex
                }
            };

            var filterDiscountMapping = {
                "discountMapping": {
                    "$regex": regex
                }
            };
            var filterStoreCategory = {
                "storeCategory": {
                    "$regex": regex
                }
            };
            keywordFilter['$or'] = [filterDiscount, filterDiscountMapping, filterStoreCategory];
        }

        query["$and"] = [_default];
        return query;
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.inventory.master.Discount}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        return this.collection.createIndexes([dateIndex]);
    }

    _beforeInsert(discount) {
        discount.code = generateCode(moduleId);
        return Promise.resolve(discount);
    };

    _validate(discount) {
        var valid = discount;
        var errors = {};
        var getStores;

        if (valid.storeCategory === "ALL") {
            getStores = this.storeManager.getStore();
        } else {
            if (valid.stores) {
                var storeName = {'name' : valid.stores.name};
                getStores = this.storeManager.getSingleByQuery(storeName);
            }
        }

        return Promise.all([getStores])
            .then(result => {
                valid.stores = result[0];

                if (!valid.discount || valid.discount == 0) {
                    errors["discount"] = "Masukkan Nilai Diskon";
                }

                if (!valid.startDate || valid.startDate == '') {
                    errors["startDate"] = "Masukkan Mulai Berlaku Diskon";
                }

                if (!valid.endDate || valid.endDate == '') {
                    errors["endDate"] = "Masukkan Mulai Berakhir Diskon";
                }

                if (!valid.stamp) {
                    valid = new Discount(valid);
                }

                valid.stamp(this.user.username, "manager");


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                return Promise.resolve(valid);
            })
    }
};