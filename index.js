'use strict';
const delay = require('delay');
const chalk = require('chalk');

class CreateLogFilterSubscriptionPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.initialized = false;

    this.commands = {
      'create-log-filter-subscription': {
        usage: 'creates a log filter subscription for your lambda',
        lifecycleEvents: [
          'create'
        ]
      },
    };

    this.hooks = {
      'create-log-filter-subscription:create': this.createLogFilterSubscription.bind(this),
      'after:deploy:deploy': this.summary.bind(this),
      'after:info:info': this.summary.bind(this),
    };
  }

  initializeVariables() {
    if (!this.initialized) {
      this.enabled = this.evaluateEnabled();
      if (this.enabled) {
        const credentials = this.serverless.providers.aws.getCredentials();
        this.kinesis = new this.serverless.providers.aws.sdk.Kinesis(credentials);
        this.iam = new this.serverless.providers.aws.sdk.IAM(credentials);
        this.cloudWatchLogs = new this.serverless.providers.aws.sdk.CloudWatchLogs(credentials);
        this.kinesisStreamName = this.serverless.service.custom.logFilterSubscription.kinesisStreamName;
        this.roleName = this.serverless.service.custom.logFilterSubscription.roleName;
        this.filterPattern = this.serverless.service.custom.logFilterSubscription.filterPattern;
        this.name = this.serverless.service.custom.logFilterSubscription.name;

      }

      this.initialized = true;
    }
  }



  /**
   * Determines whether this plug-in should be enabled.
   *
   * This method reads the customCertificate property "enabled" to see if this plug-in should be enabled.
   * If the property's value is undefined, a default value of true is assumed (for backwards
   * compatibility).
   * If the property's value is provided, this should be boolean, otherwise an exception is thrown.
   */
  evaluateEnabled() {
    const enabled = this.serverless.service.custom.logFilterSubscription.enabled;
    if (enabled === undefined) {
      return true;
    }
    if (typeof enabled === 'boolean') {
      return enabled;
    } else if (typeof enabled === 'string' && enabled === 'true') {
      return true;
    } else if (typeof enabled === 'string' && enabled === 'false') {
      return false;
    }
    throw new Error(`serverless-log-filter-subscription: Ambiguous enablement boolean: '${enabled}'`);
  }

  reportDisabled() {
    return Promise.resolve()
      .then(() => this.serverless.cli.log('serverless-log-filter-subscription: custom log filter subscription is disabled.'));
  }


  /**
   * Creates a log filter subscription for the given options set in serverless.yml under custom -> logFilterSubscription
   */
  createLogFilterSubscription() {

    this.initializeVariables();
    if (!this.enabled) {
      return this.reportDisabled();
    }
    this.serverless.cli.log(`Trying to create log filter subscription for ${this.logGroupName} to stream ${this.kinesisStreamName} ...`);
    this.serverless.cli.consoleLog(chalk.yellow('Gathering infos ...'));
    return this.getExistingStream().then(streamArn => {
      if (streamArn) {
        this.getRole().then(roleArn => {
          if (roleArn) {
            this.serverless.cli.consoleLog(chalk.yellow('Creating log filter subscriptions for all functions ...'));
            const functions = this.serverless.service.functions;
            for (const key in functions) {
              if (functions.hasOwnProperty(key)) {
                const func = functions[key];
                let logGroupName = `/aws/lambda/${func.name}`;
                this.serverless.cli.consoleLog(chalk.yellow(`Creating log filter subscription for ${func.name}`));
                this.createSubscription(streamArn, roleArn, logGroupName).then(data => {
                  this.serverless.cli.consoleLog(chalk.yellow(`Created log filter subscription for ${func.name}`));
                });
              }
            }
          }
        });
      }
    });

  }

  getSubscription() {
    var params = {
      logGroupName: this.logGroupName,
      filterNamePrefix: this.filterNamePrefix,
      limit: 1
    };

    return this.cloudWatchLogs.describeSubscriptionFilters(params).promise().then(data => {
      if (data) {
        return data;
      }
    }).catch(error => {
      if (error.code == 'ResourceNotFoundException') {
        return undefined;
      }
      throw error;
    });
  }

  createSubscription(destinationArn, roleArn, logGroupName) {
    var params = {
      destinationArn: destinationArn,
      filterName: this.name,
      filterPattern: this.filterPattern,
      logGroupName: logGroupName,
      roleArn: roleArn
    };

    return this.cloudWatchLogs.putSubscriptionFilter(params).promise().then(data => {
      if (data) {
        return data;
      }
    }).catch(error => {
      throw error;
    });
  }

  getRole() {
    var params = {
      RoleName: this.roleName
    };

    return this.iam.getRole(params).promise().then(data => {
      if (data) {
        return data.Role.Arn;
      }
      return undefined;
    });
  }

  getExistingStream() {
    var params = {
      StreamName: this.kinesisStreamName,
      Limit: 1
    };

    return this.kinesis.describeStream(params).promise().then(data => {
      if (data) {
        return data.StreamDescription.StreamARN;
      }
      return undefined;
    });
  }

  //   if (existingCert) {
  //     this.serverless.cli.log(`Certificate for ${this.domain} in ${this.region} already exists. Skipping ...`);
  //     return;
  //   }

  //   let params = {
  //     DomainName: this.domain,
  //     ValidationMethod: 'DNS',
  //     IdempotencyToken: this.idempotencyToken
  //   };

  //   return this.acm.requestCertificate(params).promise().then(requestCertificateResponse => {
  //     this.serverless.cli.log(`requested cert: ${requestCertificateResponse.CertificateArn}`);

  //     var params = {
  //       CertificateArn: requestCertificateResponse.CertificateArn
  //     };

  //     return delay(10000).then(() => this.acm.describeCertificate(params).promise().then(certificate => {
  //       this.serverless.cli.log(`got cert info: ${certificate.Certificate.CertificateArn} - ${certificate.Certificate.Status}`);
  //       return this.createRecordSetForDnsValidation(certificate).then(() => this.waitUntilCertificateIsValidated(certificate.Certificate.CertificateArn));
  //     }).catch(error => {
  //       this.serverless.cli.log('could not get cert info', error);
  //       console.log('problem', error);
  //       throw error;
  //     }));


  //   }).catch(error => {
  //     this.serverless.cli.log('could not request cert', error);
  //     console.log('problem', error);
  //     throw error;
  //   });


  // }).catch(error => {
  //   this.serverless.cli.log('could not get certs', error);
  //   console.log('problem', error);
  //   throw error;
  // })

  // waitUntilCertificateIsValidated(certificateArn) {
  //   this.serverless.cli.log('waiting until certificate is validated...');
  //   var params = {
  //     CertificateArn: certificateArn /* required */
  //   };
  //   return this.acm.waitFor('certificateValidated', params).promise().then(data => {
  //     this.serverless.cli.log(`cert was successfully created and validated and can be used now`);
  //   }).catch(error => {
  //     this.serverless.cli.log('certificate validation failed', error);
  //     console.log('problem', error);
  //     throw error;
  //   });
  // }

  // getHostedZoneId() {

  //   return this.route53.listHostedZones({}).promise().then(data => {

  //     if (this.hostedZoneId) {
  //       return this.hostedZoneId;
  //     }

  //     let hostedZone = data.HostedZones.filter(x => x.Name == this.hostedZoneName);
  //     if (hostedZone.length == 0) {
  //       throw "no hosted zone for domain found"
  //     }

  //     this.hostedZoneId = hostedZone[0].Id.replace(/\/hostedzone\//g, '');
  //     return this.hostedZoneId;
  //   }).catch(error => {
  //     this.serverless.cli.log('certificate validation failed', error);
  //     console.log('problem', error);
  //     throw error;
  //   });
  // }

  // /**
  //  * create the record set required for valdiation type dns. the certificate has the necessary information.
  //  * at least a short time after the cert has been created, thats why you should delay this call a bit after u created a new cert
  //  */
  // createRecordSetForDnsValidation(certificate) {
  //   return this.getHostedZoneId().then((hostedZoneId) => {
  //     var params = {
  //       ChangeBatch: {
  //         Changes: [
  //           {
  //             Action: "CREATE",
  //             ResourceRecordSet: {
  //               Name: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Name,
  //               ResourceRecords: [
  //                 {
  //                   Value: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Value
  //                 }
  //               ],
  //               TTL: 60,
  //               Type: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Type
  //             }
  //           }
  //         ],
  //         Comment: `DNS Validation for certificate ${certificate.Certificate.DomainValidationOptions[0].DomainName}`
  //       },
  //       HostedZoneId: hostedZoneId
  //     };
  //     return this.route53.changeResourceRecordSets(params).promise().then(recordSetResult => {
  //       this.serverless.cli.log('dns validation record created - soon the certificate is functional');
  //     }).catch(error => {
  //       this.serverless.cli.log('could not create record set for dns validation', error);
  //       console.log('problem', error);
  //       throw error;
  //     });
  //   });
  // }

  /**
   * Prints out a summary
   */
  summary() {
    this.initializeVariables();
    if (!this.enabled) {
      return this.reportDisabled();
    }
    this.serverless.cli.consoleLog(chalk.yellow('LogFilterSubscription'));
    // return this.getExistingCertificate().then(existingCertificate => {
    //   this.serverless.cli.consoleLog(chalk.yellow.underline('Serverless Certificate Creator Summary'));

    //   this.serverless.cli.consoleLog(chalk.yellow('Certificate'));
    //   this.serverless.cli.consoleLog(`  ${existingCertificate.CertificateArn} => ${existingCertificate.DomainName}`);
    //   return true;
    // });
  }
}



module.exports = CreateLogFilterSubscriptionPlugin;
