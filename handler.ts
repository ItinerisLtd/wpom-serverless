import {APIGatewayProxyHandler} from 'aws-lambda'
import {CloudFormation, CloudFront, IAM} from 'aws-sdk'

import * as templates from './templates'

export const create: APIGatewayProxyHandler = async event => {
  const prefix = process.env.PREFIX
  console.info('event', event)
  const {name} = JSON.parse(event.body)
  console.info('name', name)

  const nameRegex = RegExp('^[a-z0-9\-]+$')
  const isNameValid = typeof (name) === 'string' && nameRegex.test(name)
  if (!isNameValid) {
    return {
      statusCode: 422,
      body: JSON.stringify({
        Status: 'Validation Failed',
        Message: `'name' must in format ${nameRegex}`,
        Error: {
          Name: name,
        },
      }),
    }
  }

  const stackName = `${prefix}-${name}`
  console.info('stackName', stackName)
  const productionName = `${prefix}-prod-${name}`
  console.info('productionName', stackName)
  const stagingName = `${prefix}-staging-${name}`
  console.info('stagingName', stackName)

  const params = {
    StackName: stackName,
    Capabilities: [
      'CAPABILITY_NAMED_IAM'
    ],
    OnFailure: 'DELETE',
    Parameters: [
      {
        ParameterKey: 'ProductionName',
        ParameterValue: productionName
      },
      {
        ParameterKey: 'StagingName',
        ParameterValue: stagingName
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
          Name: name,
          Error: err.stack,
        }),
      }
    }
  )
}

export const show: APIGatewayProxyHandler = async event => {
  try {
    const name: string = event.pathParameters.name

    // Production
    const ProductionCloudfrontDistribution = await getResource(name, 'ProductionCloudFrontDistribution')
    console.info(ProductionCloudfrontDistribution)

    const cloudfront = new CloudFront()
    const {Distribution: ProductionDistribution} = await cloudfront.getDistribution({
      Id: ProductionCloudfrontDistribution.StackResourceDetail.PhysicalResourceId
    }).promise()
    console.info(ProductionDistribution)

    const ProductionS3Bucket = await getResource(name, 'ProductionS3Bucket')
    console.info(ProductionS3Bucket)

    const ProductionIAMUser = await getResource(name, 'ProductionIAMUser')
    console.info(ProductionIAMUser)

    // Staging
    const StagingCloudfrontDistribution = await getResource(name, 'StagingCloudFrontDistribution')
    console.info(StagingCloudfrontDistribution)

    const {Distribution: StagingDistribution} = await cloudfront.getDistribution({
      Id: StagingCloudfrontDistribution.StackResourceDetail.PhysicalResourceId
    }).promise()
    console.info(StagingDistribution)

    const StagingS3Bucket = await getResource(name, 'StagingS3Bucket')
    console.info(StagingS3Bucket)

    const StagingIAMUser = await getResource(name, 'StagingIAMUser')
    console.info(StagingIAMUser)

    return {
      statusCode: 200,
      body: JSON.stringify({
        ProductionDistribution,
        ProductionS3Bucket,
        ProductionIAMUser,
        StagingDistribution,
        StagingS3Bucket,
        StagingIAMUser,
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
    const {name, resource} = event.pathParameters
    console.info(name)
    console.info(resource)

    const IAMUser = await getResource(name, resource)
    console.info(IAMUser)

    const iam = new IAM()
    const accessKey = await iam.createAccessKey({
      UserName: IAMUser.StackResourceDetail.PhysicalResourceId
    }).promise()

    // Don't log secret keys!
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
