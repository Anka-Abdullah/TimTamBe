const helper = require('../helper/response')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const randomTokens = require('random-token')
const {
  registerUserModel,
  cekEmailModel,
  cekCode,
  patchUserModel
} = require('../model/m_user')
const fs = require('fs')
module.exports = {
  registerUser: async (req, res) => {
    try {
      const {
        user_name,
        user_email,
        user_password,
        user_role,
        user_phone,
        user_address,
        user_city,
        user_post_code
      } = req.body
      if (user_name === '' || user_password === '' || user_email === '') {
        return helper.response(res, 400, 'Please Field every Field')
      } else {
        if (user_password.length <= 7) {
          return helper.response(
            res,
            400,
            'Password Length Atleast Have 8 Character'
          )
        } else {
          const salt = bcrypt.genSaltSync(10)
          const encryptPassword = bcrypt.hashSync(user_password, salt)
          const randomToken = randomTokens(16)
          const setData = {
            user_code: randomToken,
            user_name,
            user_email,
            user_password: encryptPassword,
            user_role,
            user_phone,
            user_address,
            user_city,
            user_post_code,
            user_status: 0
          }
          const transporter = nodemailer.createTransport({
            host: 'smtp.google.com',
            service: 'gmail',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: 'skyrouterweb6@gmail.com', // generated ethereal user
              pass: 'skyrouter6' // generated ethereal password
            }
          })
          await transporter.sendMail({
            from: '"Sky Router Confirmation Email" <skyrouterweb6@gmail.com>', // sender address
            to: user_email, // list of receivers
            subject: 'Confirmation Email', // Subject line
            html: `Click Here To Verif Your Email <a>http://localhost:3000/user/verification/${randomToken}</a>` // html body
          })
          const result = await registerUserModel(setData)
          return helper.response(res, 200, 'Success Register Data', result)
        }
      }
    } catch (error) {
      console.log(error)
      return helper.response(res, 400, 'Something error', error)
    }
  },
  loginUser: async (req, res) => {
    try {
      const { user_email, user_password } = req.body
      const cekEmail = await cekEmailModel(user_email)
      if (cekEmail > 0) {
        return helper.response(res, 404, 'User Not Found')
      } else {
        if (cekEmail[0].user_status === 1) {
          const password = bcrypt.compareSync(
            user_password,
            cekEmail[0].user_password
          )
          if (password) {
            const {
              user_id,
              user_name,
              user_email,
              user_role,
              user_phone,
              user_address,
              user_city,
              user_post_code,
              user_status
            } = cekEmail[0]
            const payload = {
              user_id,
              user_name,
              user_email,
              user_role,
              user_phone,
              user_address,
              user_city,
              user_post_code,
              user_status
            }
            const token = jwt.sign(payload, 'Sky_Router', { expiresIn: '12h' })
            const result = { ...payload, token }
            return helper.response(res, 200, 'Success Log In', result)
          } else {
            return helper.response(res, 404, 'Wrong Password')
          }
        } else {
          return helper.response(res, 400, 'Please Verify Your Email First')
        }
      }
    } catch (error) {
      return helper.response(res, 400, "Can't Login", error)
    }
  },
  verifyUser: async (req, res) => {
    try {
      const { id } = req.params
      const verification = await cekCode(id)
      if (verification.length > 0) {
        if (verification[0].user_code === id) {
          const setData = {
            ...verification[0],
            ...{ user_code: '', user_status: 1 }
          }
          await patchUserModel(setData, verification[0].user_id)
          return helper.response(res, 200, 'Success Verify User')
        }
      } else {
        return helper.response(res, 404, 'Code Not Valid')
      }
    } catch (error) {
      return helper.response(
        res,
        400,
        'Something Wrong Please Try Again',
        error
      )
    }
  },
  patchUser: async (req, res) => {
    try {
      const { user_id, user_email } = req.decodeToken
      const {
        user_name,
        user_phone,
        user_address,
        user_city,
        user_post_code
      } = req.body
      const cekEmail = await cekEmailModel(user_email)
      if (cekEmail.length > 0) {
        const setData = {
          user_name,
          user_phone,
          user_address,
          user_city,
          user_post_code,
          user_updated_at: new Date()
        }
        if (req.file === undefined) {
          const newData = {
            ...cekEmail[0],
            ...setData
          }
          const result = await patchUserModel(newData, user_id)
          return helper.response(res, 200, 'Success Patch Data', result)
        } else {
          if (cekEmail[0].user_image === '') {
            const newData = {
              ...cekEmail[0],
              ...setData,
              ...{ user_image: req.file.filename }
            }
            const result = await patchUserModel(newData, user_id)
            return helper.response(res, 200, 'Success Patch Data', result)
          } else {
            fs.unlink('./uploads/' + cekEmail[0].user_image, async (err) => {
              if (err) {
                return helper.response(res, 400, 'Failed Change Image')
              } else {
                const newData = {
                  ...cekEmail[0],
                  ...setData,
                  ...{ user_image: req.file.filename }
                }
                const result = await patchUserModel(newData, user_id)
                return helper.response(res, 200, 'Success Patch Data', result)
              }
            })
          }
        }
      } else {
        return helper.response(res, 400, 'Something Wrong Please Try Again')
      }
    } catch (error) {
      console.log(error)
      return helper.response(res, 400, "Can't Update profile", error)
    }
  },
  getLinkForgetPassword: async (req, res) => {
    try {
      const { user_email } = req.body
      const cekEmail = await cekEmailModel(user_email)
      if (cekEmail.length > 0) {
        const randomToken = randomTokens(16)
        const setData = {
          ...cekEmail[0],
          ...{ user_code: randomToken }
        }
        const transporter = nodemailer.createTransport({
          host: 'smtp.google.com',
          service: 'gmail',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: 'skyrouterweb6@gmail.com', // generated ethereal user
            pass: 'skyrouter6' // generated ethereal password
          }
        })
        await transporter.sendMail({
          from: '"Sky Router Reset Password" <skyrouterweb6@gmail.com>', // sender address
          to: user_email, // list of receivers
          subject: 'Confirmation Email', // Subject line
          html: `Click Here To Change Your Password <a>http://localhost:3000/user/forgetpassword/${randomToken}</a>` // html body
        })
        await patchUserModel(setData, cekEmail[0].user_id)
        return helper.response(
          res,
          200,
          'Success Send Link Forget Password To Your Email'
        )
      } else {
        return helper.response(res, 404, 'User Not Found')
      }
    } catch (error) {
      return helper.response(res, 400, 'Something Wrong Please Try Again')
    }
  },
  forgetPassword: async (req, res) => {
    try {
      const { id } = req.params
      const { user_password } = req.body
      const cekCodes = await cekCode(id)
      if (cekCodes.length > 0) {
        if (user_password === '' || user_password === undefined) {
          return helper.response(res, 400, "Password Can't Be Empty")
        } else {
          if (user_password.length <= 7) {
            return helper.response(
              res,
              400,
              'Password Atleast Have 8 Characters'
            )
          } else {
            const salt = bcrypt.genSaltSync(10)
            const encryptPassword = bcrypt.hashSync(user_password, salt)
            const setData = {
              ...cekCodes[0],
              ...{ user_password: encryptPassword }
            }
            const resetPassword = await patchUserModel(
              setData,
              cekCodes[0].user_id
            )
            return helper.response(
              res,
              200,
              'Sucess Reset Password',
              resetPassword
            )
          }
        }
      }
    } catch (error) {
      return helper.response(res, 400, 'Something wrong please try again')
    }
  }
}
