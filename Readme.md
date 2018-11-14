# serverless-log-filter-subscription

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-log-filter-subscription.svg)](https://badge.fury.io/js/serverless-log-filter-subscription)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amplify-education/serverless-domain-manager/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/235fe249b8354a3db0cc5926dba47899)](https://www.codacy.com/app/CFER/serverless-log-filter-subscription?utm_source=github.com&utm_medium=referral&utm_content=schwamster/serverless-log-filter-subscription&utm_campaign=badger)
[![npm downloads](https://img.shields.io/npm/dt/serverless-log-filter-subscription.svg?style=flat)](https://www.npmjs.com/package/serverless-log-filter-subscription)

This serverless plugin creates log filter subscription for all lambda functions configured in your projects serverless.yml. This is useful if you already have a kinesis stream setup that you want to fill with all your lambdas logs to forward them to other logging tools like splunk, elastic search...

This plugin is developed very much to the point and therefore does expect the parameters in a certain way. Much more flexibility is possible if somebody is interested in taking it further.

# Usage

        npm i serverless-log-filter-subscription --save-dev

open serverless.yml and add the following:

        plugins:
        - serverless-log-filter-subscription

        ...

        custom:
            logFilterSubscription:
                name: 'example-lambda-logfilter' //required
                roleName: 'someRole'             //required - must exist
                filterPattern: ''                //required - empty string is ok
                kinesisStreamName: 'someStream'  //required


now you can run:

        serverless create-log-filter-subscription
