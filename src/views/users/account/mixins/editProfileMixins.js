import {mapGetters, mapMutations} from 'vuex'
import { throttle } from '@/utils'

export default {
  name: 'editProfile',
  data() {
    return {
      userInfo: [
        {label: 'Nick Name', prop: 'playerNick', tips: 'Please enter email address', rules: 'required', value: '', disabled: false},
        {label: 'Mobile', prop: 'mobile', value: '', disabled: true},
        {label: 'Email', prop: 'email', value: '', disabled: true},
        {label: 'First Name', prop: 'firstName', tips: 'Please enter First Name', rules: 'required', value: '', disabled: true},
        {label: 'Last Name', prop: 'lastName', tips: 'Please enter Last Name', value: '', disabled: true},
        {label: 'Date of Birth', prop: 'birthday', value: '', disabled: false, type: 'date'},
        {label: 'Gender', prop: 'gender', tips: 'Please select gender', value: '', type: 'gender', disabled: false},
        {label: 'BVN', prop: 'bvn', tips: 'Please enter BVN', value: '', disabled: true},
        {label: 'Region', prop: 'regionAll', value: '', type: 'region', disabled: false},
        {label: 'Address', prop: 'address', tips: 'Please enter Address', value: '', type: 'address', disabled: false}
      ],
      initInfo: true,
      editPanel: false,
      editfiled: {},
      formValid: true,
      form: {},
      rules: {
        required: val => (val || '').length > 0 || 'This field is required',
        email: v => /.+@.+\..+/.test(v) || 'E-mail must be valid',
        bvn: [
          val => (val || '').length > 0 || 'This field is required',
          this.$rules.numberVal3
        ]
      },
      genderList: [
        {label: 'female', value: 'female'},
        {label: 'male', value: 'male'}
      ],
      selectGender: '',
      modal: false,
      date: new Date().toISOString().substr(0, 10),
      addressInfo: {},
      selectCity: false,
      regionCodeArr: [],
      detailAddress: '',
      infoData: {
        data: {},
        state: 2
      },
      notInput: false,
      changedStateId: ''
    }
  },
  components: {
  },
  computed: {
    ...mapGetters(['isLogin', 'loginInfo']),
    stateOptions() {
      return Object.values(this.addressInfo)
    },
    calcAddress() {
      return (this.changedStateId && this.addressInfo[this.changedStateId]) || {}
    },
    cityOptions() {
      return this.calcAddress.list || []
    }
  },
  mounted() {
    this.getInfor()
    this.eventBus.$on('editFinish', (data) => {
      this.editFinish(data)
    })
  },
  watch: {
    loginInfo: {
      immediate: true,
      handler() {
        if (this.initInfo && this.loginInfo.token) {
          this.initInfo = false
          this.setInfo({...this.loginInfo})
        }
      }
    }
  },
  methods: {
    ...mapMutations(['MONEY_STATE', 'SET_LOGININFO', 'EDIT_PROFILE']),
    // ??????????????????
    async getInfor() {
      this.initInfo = true
      await this.$store.dispatch('getLoginInfo')
      this.setInfo({...this.loginInfo})
    },
    // ??????????????????
    setInfo: throttle(function (info) {
      this.infoData.data = info
      this.userInfo.forEach(item => {
        item.value = info[item.prop]
        if (item.prop === 'birthday') {
          item.value = info.birthday ? this.$moment(info.birthday).format('yy-MM-DD') : null
        }
        if (this.infoData.data.bvn !== '') {
          if (item.prop === 'firstName' || item.prop === 'lastName' || item.prop === 'bvn') {
            item.disabled = true
          }
          this.notInput = true
        }
        if (item.prop === 'regionAll' && info.regionName) {
          if (info.regionName.toString().indexOf('undefined') === -1) {
            item.value = info.regionName ? info.regionName.replace('\\\\', ' ') : ''
          }
        }
        if (item.prop === 'address' && info.linkAddress !== '') {
          if (info.regionName && info.regionName.toString().indexOf('undefined') === -1) {
            let txt = info.regionName ? info.regionName.replace('\\\\', ' ') : ''
            let detail = info.linkAddress.split(txt)
            item.value = detail[0] || detail[1]
          } else {
            item.value = info.linkAddress
          }
        }
        this.$set(this.form, item.prop, (item.value || '').trim())
      })
      this.getAddress()
    }, 1000),
    // ???????????????????????????
    async getAddress() {
      await this.queryRegion(126)
      if (this.infoData.data.linkAddress &&
        this.infoData.data.linkAddress.indexOf('undefined') === -1 &&
        this.infoData.data.regionCode &&
        this.infoData.data.regionCode.toString().indexOf('undefined') === -1
      ) {
        let codeArr = (this.infoData.data.regionCode).split(',')
        let nameArr = (this.infoData.data.regionName).split('\\' + '\\')
        this.regionCodeArr = codeArr
        let txt = ''
        if (codeArr.length > 1) {
          txt = nameArr[0] + ' ' + nameArr[1] + ' '
          let detail = this.infoData.data.linkAddress.split(txt)
          this.detailAddress = detail[1]
          await this.queryRegion(parseInt(codeArr[0]), 2)
          this.setDefaultRegin()
        }
      }
    },
    // ??????state
    selectState(value) {
      // ??????city?????????
      this.queryRegion(value.id, 2)
      this.changedStateId = value.id
      this.selectCity = true
    },
    // ??????????????????
    async queryRegion(num, type) {
      if (type === 2) {
        if (this.addressInfo[num] && this.addressInfo[num].list) return
      } else if (this.stateOptions.length) {
        return
      }
      const res = await this.$api.queryRegion({
        data: {
          pid: num
        }
      })
      if (res.code !== 0) return
      if (type === 2) {
        this.$set(this.addressInfo[num], 'list', res.data || [])
      } else {
        const list = res.data || []
        list.map(item => {
          this.$set(this.addressInfo, item.id, item)
        })
        this.$set(this.form, 'city', '')
      }
    },
    setDefaultRegin() { // ??????????????????
      if (!this.form.state && this.regionCodeArr[0] && this.regionCodeArr[1]) {
        this.changedStateId = this.regionCodeArr[0]
        this.$nextTick(() => {
          this.$set(this.form, 'state', this.calcAddress)
          for (let i = 0; i < this.cityOptions.length; i++) {
            if (Number(this.cityOptions[i].id) === Number(this.regionCodeArr[1])) {
              this.$set(this.form, 'city', this.cityOptions[i])
            }
          }
        })
      }
    },
    changeGender(val) {
      this.$set(this.form, 'gender', val)
      this.selectGender = val
    },
    saveDate() {
      this.infoData.data.birthday = this.date
      if (this.type === '2') {
        this.$set(this.form, 'birthday', this.date)
      } else {
        this.userInfo.forEach(item => {
          if (item.prop === 'birthday') {
            item.value = this.date
          }
        })
      }
      this.modal = false
    },
    // ??????????????????
    activeId (item) {
      // getVerificationCode -> checkVerificationCode -> rebindAccount
      // getVerificationCode -> rebindAccount
      // ??????????????? ??? ??????????????? ?????? ???????????? ????????????????????? ???????????????????????????????????????
      // ????????????  ??? ??????????????? ?????? ????????? ???????????????????????? ?????????????????????
      if (item.prop === 'mobile' || item.prop === 'email' || item.prop === 'bvn' || item.prop === 'firstName' || item.prop === 'lastName') {
        return
      }
      if (item.prop === 'birthday') {
        this.modal = true
        return
      }
      // ???????????????????????????
      if (item.prop === 'regionAll') {
        this.selectCity = true
        // if (this.infoData.data.regionCode !== '') {
        //   let code = this.infoData.data.regionCode
        //   if (code.toString().indexOf(',') === -1 && code !== '' && code !== 'undefined') {
        //     this.form.state = this.infoData.data.state
        //     // this.form.city = ''
        //     this.selectCity = true
        //   } else if (code.toString().indexOf(',') !== -1 && code.split(',')[0] !== 'undefined') {
        //     this.form.state = parseInt(code.split(',')[0])
        //     this.selectCity = true
        //     if (code.split(',')[1] !== 'undefined') {
        //       // this.form.city = parseInt(code.split(',')[1])
        //       this.queryRegion(parseInt(code.split(',')[0]), 2)
        //     }
        //   }
        //   // this.changedStateId = code
        // }
        // this.queryRegion(126)
      }
      if (item.prop === 'gender') {
        this.selectGender = item.value
      }
      // ??????address
      if (item.prop === 'address') {
        if (this.infoData.data.regionCode === '' || this.infoData.data.regionCode.toString().indexOf('undefined') !== -1 || this.infoData.data.regionCode.toString().indexOf(',') === -1) {
          let msg = 'Please select region first!'
          this.$common.setMsg(msg, 'error')
          return
        }
      }
      if (item.disabled) return
      this.editPanel = true
      this.EDIT_PROFILE(true)
      this.editfiled = item
      this.eventBus.$emit('toolbarName', item.label)
      this.form[item.prop] = item.value
    },
    // ?????????????????????
    editFinish(bl) {
      if (bl) {
        if (this.type !== '2') {
          let valid = this.$refs.form.validate()
          if (!valid) return
        }
        this.infoData.data = Object.assign(this.infoData.data, this.form)
        let regionName = ''
        let stateCode = ''
        console.log(this.form.state.name)
        console.log(this.form.city)
        if (this.form.state && this.form.state !== 'undefined') {
          stateCode = this.form.state.id
          regionName = this.form.state.name
          if (this.form.city.id !== '' && this.form.city.id !== 'undefined') {
            stateCode = stateCode + ',' + this.form.city.id
          }
          if (this.form.city.name && this.form.city.name !== 'undefined') {
            regionName = regionName + '\\\\' + this.form.city.name
          }
        }
        this.infoData.data.linkAddress = ''
        if (stateCode && regionName) {
          this.infoData.data.regionName = regionName
          this.infoData.data.regionCode = stateCode
          this.infoData.data.linkAddress = regionName.replace('\\\\', ' ') + ' '
        }
        if (this.form.address !== undefined && this.form.address !== 'undefined') {
          this.infoData.data.linkAddress = this.form.address
          this.infoData.data.address = this.form.address
        } else if (this.infoData.data.linkAddress !== '') {
          if (this.infoData.data.regionName.toString().indexOf('undefined') === -1) {
            let txt = this.infoData.data.regionName ? this.infoData.data.regionName.replace('\\\\', ' ') : ''
            let detail = this.infoData.data.linkAddress.split(txt)
            if (detail[0] !== '') {
              this.infoData.data.address = detail[0]
            } else {
              this.infoData.data.address = detail[1]
            }
          }
          this.form.address = this.infoData.data.address
          // this.infoData.data.address = ''
        }
        this.userInfo.forEach(item => {
          item.value = this.infoData.data[item.prop]
          if (item.prop === 'regionAll') {
            if (this.infoData.data.regionName) {
              item.value = this.infoData.data.regionName.replace('\\\\', ' ')
            }
          }
          if (item.prop === 'address') {
            if (this.form.address && this.form.address !== 'undefined') {
              item.value = this.form.address
            }
          }
        })
        this.editPanel = false
        this.EDIT_PROFILE(false)
        this.eventBus.$emit('toolbarName', false)
      } else {
        this.editPanel = false
      }
    },
    async saveProfile() {
      let userData = this.infoData.data
      let data = {
        birthday: userData.birthday,
        gender: userData.gender,
        linkAddress: userData.linkAddress,
        regionCode: userData.regionCode,
        regionName: userData.regionName,
        playerNick: userData.playerNick,
      }
      if (userData.mobile === userData.playerAccount) {
        data.email = userData.email
      } else {
        data.mobile = userData.mobile
      }
      if (!this.notInput) {
        data.firstName = userData.firstName
        data.lastName = userData.lastName
        data.bvn = userData.bvn + ''
      }
      const res = await this.$api.userUpdate({
        data
      })
      this.$set(this.form, 'state', '')
      this.$set(this.form, 'city', '')
      if (res.code !== 0) return
      this.getInfor()
    },
    goBackSet() {
      if (this.editPanel) {
        this.editPanel = false
        this.EDIT_PROFILE(false)
      } else {
        this.$router.go(-1)
      }
    }
  },
}
