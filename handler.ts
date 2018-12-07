import {APIGatewayProxyHandler} from 'aws-lambda'
import {CloudFormation, CloudFront, IAM} from 'aws-sdk'
import * as url from 'url'

import * as templates from './templates'

export const create: APIGatewayProxyHandler = async event => {
  const prefix = process.env.PREFIX
  const {domainName} = JSON.parse(event.body)
  console.info('domainName', domainName)

  const {hostname} = url.parse(`https://${prefix}.${domainName}`)
  console.info('hostname', hostname)

  if (typeof(hostname) !== 'string' || hostname.length < 1) {
    return {
      statusCode: 422,
      body: JSON.stringify({
        Status: 'Validation Failed',
        Error: {
          DomainName: domainName,
          Hostname: hostname,
        },
      }),
    }
  }

  const name = `${hostname}`
  console.info('name', name)

  const stackName = name.replace(/\./g, '-')
  console.info('stackName', stackName)

  const params = {
    StackName: stackName,
    Capabilities: [
      'CAPABILITY_NAMED_IAM'
    ],
    OnFailure: 'DELETE',
    Parameters: [
      {
        ParameterKey: 'Name',
        ParameterValue: name
      }
    ],
    TemplateBody: templates.cloudformation,
    TimeoutInMinutes: 60
  }
  console.log('params', params)

  const cloudformation = new CloudFormation()
  const promise = cloudformation.createStack(params).promise()

  return promise.then(
    function (data) {
      console.info('data', data)

      return {
        statusCode: 202,
        body: JSON.stringify({
          Status: 'Accepted',
          StackName: stackName,
          Hostname: hostname,
          Message: 'The stack has been scheduled for processing. Be patient. It cloud take ~20 minutes.',
          Stack: data
        }),
      }
    },
    function (err) {
      console.error('err', err)

      return {
        statusCode: 400,
        body: JSON.stringify({
          Status: 'Error',
          StackName: stackName,
          Hostname: hostname,
          Error: err.stack
        }),
      }
    }
  )
}

export const show: APIGatewayProxyHandler = async event => {
  try {
    const name: string = event.pathParameters.name

    const CloudfrontDistribution = await getResource(name, 'CloudFrontDistribution')
    console.info(CloudfrontDistribution)

    const cloudfront = new CloudFront()
    const {Distribution} = await cloudfront.getDistribution({
      Id: CloudfrontDistribution.StackResourceDetail.PhysicalResourceId
    }).promise()
    console.info(Distribution)

    const S3Bucket = await getResource(name, 'S3Bucket')
    console.info(S3Bucket)

    const IAMUser = await getResource(name, 'IAMUser')
    console.info(IAMUser)

    return {
      statusCode: 200,
      body: JSON.stringify({
        Distribution,
        S3Bucket,
        IAMUser
      }),
    }
  } catch (err) {
    console.error('err', err)

    return {
      statusCode: err.statusCode || 400,
      body: JSON.stringify({
        Status: 'Error',
        Error: err,
      })
    }
  }
}

const getResource = async (StackName: string, LogicalResourceId: string) => {
  const cloudformation = new CloudFormation()

  return cloudformation.describeStackResource({
    LogicalResourceId,
    StackName,
  }).promise()
}

export const createAccessKey: APIGatewayProxyHandler = async event => {
  try {
    const name: string = event.pathParameters.name

    const IAMUser = await getResource(name, 'IAMUser')
    console.info(IAMUser)

    const iam = new IAM()
    const accessKey = await iam.createAccessKey({
      UserName: IAMUser.StackResourceDetail.PhysicalResourceId
    }).promise()

    console.info(accessKey.AccessKey.AccessKeyId)

    return {
      statusCode: 201,
      body: JSON.stringify({
        AccessKey: accessKey.AccessKey
      }),
    }
  } catch (err) {
    console.error('err', err)

    return {
      statusCode: err.statusCode || 400,
      body: JSON.stringify({
        Status: 'Error',
        Error: err,
      })
    }
  }
}
