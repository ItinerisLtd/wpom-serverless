export const cloudformation = `{
  "Description": "WP Offload Media Stack",
  "Parameters": {
    "ProductionName": {
      "Type": "String",
      "Description": "The Production name",
      "MinLength": 1
    },
    "StagingName": {
      "Type": "String",
      "Description": "The staging name",
      "MinLength": 1
    },
  },
  "Resources": {
    "ProductionS3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Ref": "ProductionName" },
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        },
        "VersioningConfiguration": {
          "Status": "Enabled"
        }
      },
      "DeletionPolicy": "Retain"
    },
    "ProductionBucketPolicy" : {
      "Type": "AWS::S3::BucketPolicy",
      "Properties" : {
        "Bucket" : { "Ref": "ProductionName" },
        "PolicyDocument": {
          "Statement": [{
            "Action": [
              "s3:DeleteBucket"
            ],
            "Effect": "Deny",
            "Resource": { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": { "Ref": "ProductionName" }} ]},
            "Principal": {
              "AWS": [
                "*"
              ]
            }
          }]
        }
      }
    },
    "ProductionIAMUser": {
      "Type": "AWS::IAM::User",
      "Properties": {
        "UserName": { "Ref": "ProductionName" },
        "Policies": [
          {
            "PolicyName": { "Ref": "ProductionName" },
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [

                {
                  "Effect": "Allow",
                  "Action": [
                    "s3:DeleteObject",
                    "s3:Put*",
                    "s3:Get*",
                    "s3:List*"
                  ],
                  "Resource": [
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": {"Ref": "ProductionName" }} ]},
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}/*", { "BucketName": {"Ref": "ProductionName" }} ]}
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    "ProductionCloudFrontDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": { "Fn::Sub": [ "\${BucketName}.s3.amazonaws.com", { "BucketName": {"Ref": "ProductionName" }} ]},
              "Id": { "Ref": "ProductionName" },
              "S3OriginConfig": {
                "OriginAccessIdentity": ""
              }
            }
          ],
          "Enabled": "true",
          "DefaultCacheBehavior": {
            "Compress": "true",
            "TargetOriginId": { "Ref": "ProductionName" },
            "ForwardedValues": {
              "QueryString": "false",
              "Cookies": {
                "Forward": "none"
              }
            },
            "MinTTL": "63115200",
            "DefaultTTL": "63115201",
            "MaxTTL": "63115202",
            "ViewerProtocolPolicy": "allow-all"
          },
          "ViewerCertificate": {
            "CloudFrontDefaultCertificate": "true"
          },
          "HttpVersion": "http2"
        }
      }
    },
    "StagingS3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Ref": "StagingName" },
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        },
        "VersioningConfiguration": {
          "Status": "Enabled"
        }
      },
      "DeletionPolicy": "Retain"
    },
    "StagingBucketPolicy" : {
      "Type": "AWS::S3::BucketPolicy",
      "Properties" : {
        "Bucket" : { "Ref": "StagingName" },
        "PolicyDocument": {
          "Statement": [{
            "Action": [
              "s3:DeleteBucket"
            ],
            "Effect": "Deny",
            "Resource": { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": { "Ref": "StagingName" }} ]},
            "Principal": {
              "AWS": [
                "*"
              ]
            }
          }]
        }
      }
    },
    "StagingIAMUser": {
      "Type": "AWS::IAM::User",
      "Properties": {
        "UserName": { "Ref": "StagingName" },
        "Policies": [
          {
            "PolicyName": { "Ref": "StagingName" },
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "s3:DeleteObject",
                    "s3:Put*",
                    "s3:Get*",
                    "s3:List*"
                  ],
                  "Resource": [
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": {"Ref": "StagingName" }} ]},
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}/*", { "BucketName": {"Ref": "StagingName" }} ]}
                  ]
                }
              ]
            }
          },
          {
            "PolicyName": { "Fn::Sub": [ "\${BucketName}-read-access", { "BucketName": {"Ref": "ProductionName" }} ]},
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "s3:GetBucketLocation",
                    "s3:ListBucket",
                    "s3:GetObject"
                  ],
                  "Resource": [
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": {"Ref": "ProductionName" }} ]},
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}/*", { "BucketName": {"Ref": "ProductionName" }} ]}
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    "StagingCloudFrontDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": { "Fn::Sub": [ "\${BucketName}.s3.amazonaws.com", { "BucketName": {"Ref": "StagingName" }} ]},
              "Id": { "Ref": "StagingName" },
              "S3OriginConfig": {
                "OriginAccessIdentity": ""
              }
            }
          ],
          "Enabled": "true",
          "DefaultCacheBehavior": {
            "Compress": "true",
            "TargetOriginId": { "Ref": "StagingName" },
            "ForwardedValues": {
              "QueryString": "false",
              "Cookies": {
                "Forward": "none"
              }
            },
            "MinTTL": "63115200",
            "DefaultTTL": "63115201",
            "MaxTTL": "63115202",
            "ViewerProtocolPolicy": "allow-all"
          },
          "ViewerCertificate": {
            "CloudFrontDefaultCertificate": "true"
          },
          "HttpVersion": "http2"
        }
      }
    }
  },
  "Outputs": {
  }
}`
