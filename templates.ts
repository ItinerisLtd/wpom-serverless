export const cloudformation = `{
  "Description": "WP Offload Media Stack",
  "Parameters": {
    "Name": {
      "Type": "String",
      "Description": "The name",
      "MinLength": 1
    },
  },
  "Resources": {
    "S3Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Ref": "Name" },
        "VersioningConfiguration": {
          "Status": "Enabled"
        }
      },
      "DeletionPolicy": "Retain"
    },
    "BucketPolicy" : {
      "Type": "AWS::S3::BucketPolicy",
      "Properties" : {
        "Bucket" : { "Ref": "Name" },
        "PolicyDocument": {
          "Statement": [{
            "Action": [
              "s3:DeleteBucket"
            ],
            "Effect": "Deny",
            "Resource": { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": {"Ref": "Name" }} ]},
            "Principal": {
              "AWS": [
                "*"
              ]
            }
          }]
        }
      }
    },
    "IAMUser": {
      "Type": "AWS::IAM::User",
      "Properties": {
        "UserName": { "Ref": "Name" },
        "Policies": [
          {
            "PolicyName": { "Ref": "Name" },
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
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}", { "BucketName": {"Ref": "Name" }} ]},
                    { "Fn::Sub": [ "arn:aws:s3:::\${BucketName}/*", { "BucketName": {"Ref": "Name" }} ]}
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    "CloudFrontDistribution": {
      "Type": "AWS::CloudFront::Distribution",
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            {
              "DomainName": { "Fn::Sub": [ "\${BucketName}.s3.amazonaws.com", { "BucketName": {"Ref": "Name" }} ]},
              "Id": { "Ref": "Name" },
              "S3OriginConfig": {
                "OriginAccessIdentity": ""
              }
            }
          ],
          "Enabled": "true",
          "DefaultCacheBehavior": {
            "Compress": "true",
            "TargetOriginId": { "Ref": "Name" },
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
